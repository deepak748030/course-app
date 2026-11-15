/**
 * Elastic Multi-Core Cluster Manager.
 *
 * - Starts with `runtime.minWorkers` (default 1 worker) when idle so the server does not waste RAM,
 *   MongoDB connections, or CPU cycles during quiet hours.
 * - Continuously samples each worker's real Event Loop Utilization (ELU), p95 event-loop delay,
 *   and in-flight request count.
 * - Automatically forks additional workers up to `runtime.maxWorkers` (100% of CPU cores) when
 *   traffic or CPU load spikes.
 * - Gracefully drains and shuts down extra workers back down to `runtime.minWorkers` once load
 *   stays low for `runtime.scaleDownIdleMs`.
 * - Bridges Socket.IO room broadcasts, account revocation, and deduplicated live presence across
 *   all active workers over Node IPC without requiring an external broker.
 */
import cluster from 'node:cluster';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { runtime } from './config/runtime.js';

const SAMPLE_INTERVAL_MS = 2000;
const SCALE_UP_COOLDOWN_MS = 3000;
const DRAIN_FORCE_TIMEOUT_MS = 25_000;

let activeClusterWorkers = 1;
let inFlightRequests = 0;

/** Express middleware that tracks in-flight HTTP requests & streams on this worker. */
export function trackInFlightRequests(_req, res, next) {
  inFlightRequests += 1;
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    inFlightRequests = Math.max(0, inFlightRequests - 1);
  };
  res.once('finish', done);
  res.once('close', done);
  next();
}

export function getInFlightRequests() {
  return inFlightRequests;
}

/** Snapshot of current core & worker scaling state for `/api/health`. */
export function getClusterRuntimeState() {
  return {
    workerId: cluster.isWorker && cluster.worker ? cluster.worker.id : 1,
    clustered: cluster.isWorker,
    activeWorkers: cluster.isWorker ? activeClusterWorkers : 1,
    minWorkers: runtime.minWorkers,
    maxWorkers: runtime.maxWorkers,
    cpuCores: runtime.cpuCores,
    uvThreadpoolSize: runtime.uvThreadpoolSize,
  };
}

/** Whether the current process should act as the elastic cluster primary. */
export function shouldRunClusterPrimary() {
  if (!cluster.isPrimary) return false;
  const mode = runtime.clusterMode;
  if (mode === 'off' || mode === 'false' || mode === '0') return false;
  if (mode === 'on' || mode === 'true' || mode === '1') return runtime.maxWorkers > 1;
  // 'auto': enable on multi-core machines except when running under `node --watch` dev reloads.
  const isWatchMode = process.execArgv.some((arg) => arg.startsWith('--watch'));
  if (isWatchMode) return false;
  return runtime.maxWorkers > 1;
}

/** Start the elastic primary supervisor. */
export function runClusterPrimary() {
  if (typeof cluster.SCHED_RR === 'number') {
    cluster.schedulingPolicy = cluster.SCHED_RR;
  }

  /** @type {Map<number, { worker: import('node:cluster').Worker, isInitial: boolean, listening: boolean, draining: boolean, elu: number, lagMs: number, activeRequests: number, sockets: number, spawnedAt: number, forceKillTimer: ReturnType<typeof setTimeout> | null }>} */
  const workersMeta = new Map();
  /** @type {Map<number, Array<{ userId: string | null, role: string | null }>>} */
  const presenceByWorker = new Map();

  let shuttingDown = false;
  let highLoadStreak = 0;
  let idleSince = null;
  let lastScaleUpAt = 0;

  const sendSafe = (worker, payload) => {
    if (worker && worker.isConnected() && !worker.isDead()) {
      try {
        worker.send(payload);
      } catch {
        /* ignore IPC write race during worker exit */
      }
    }
  };

  const countNonDraining = () => {
    let count = 0;
    for (const meta of workersMeta.values()) {
      if (!meta.draining && !meta.worker.isDead()) count += 1;
    }
    return count;
  };

  const countListening = () => {
    let count = 0;
    for (const meta of workersMeta.values()) {
      if (meta.listening && !meta.draining && !meta.worker.isDead()) count += 1;
    }
    return Math.max(1, count);
  };

  const broadcastClusterState = () => {
    const active = countListening();
    for (const meta of workersMeta.values()) {
      sendSafe(meta.worker, {
        type: 'cluster:state',
        activeWorkers: active,
        maxWorkers: runtime.maxWorkers,
      });
    }
  };

  const broadcastGlobalPresence = () => {
    const signedIn = new Set();
    const learners = new Set();
    const admins = new Set();
    let visitors = 0;
    let total = 0;

    for (const entries of presenceByWorker.values()) {
      for (const c of entries) {
        total += 1;
        if (!c?.userId) {
          visitors += 1;
          continue;
        }
        signedIn.add(c.userId);
        if (c.role === 'admin') admins.add(c.userId);
        else learners.add(c.userId);
      }
    }

    const snapshot = {
      total,
      signedIn: signedIn.size,
      learners: learners.size,
      admins: admins.size,
      visitors,
      at: new Date().toISOString(),
    };

    for (const meta of workersMeta.values()) {
      sendSafe(meta.worker, { type: 'realtime:presence-snapshot', snapshot });
    }
  };

  const spawnWorker = ({ isInitial = false, reason = 'boot' } = {}) => {
    if (shuttingDown) return null;
    const worker = cluster.fork({
      IS_SCALE_WORKER: isInitial ? '0' : '1',
    });

    const meta = {
      worker,
      isInitial,
      listening: false,
      draining: false,
      elu: 0,
      lagMs: 0,
      activeRequests: 0,
      sockets: 0,
      spawnedAt: Date.now(),
      forceKillTimer: null,
    };
    workersMeta.set(worker.id, meta);

    worker.on('listening', () => {
      meta.listening = true;
      broadcastClusterState();
      if (!isInitial) {
        console.log(
          `[cluster] Worker #${worker.id} (pid ${worker.process.pid}) online [${reason}] — ${countListening()}/${runtime.maxWorkers} cores active`
        );
      }
    });

    worker.on('message', (msg) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'worker:metrics') {
        meta.elu = Number(msg.elu) || 0;
        meta.lagMs = Number(msg.lagMs) || 0;
        meta.activeRequests = Number(msg.activeRequests) || 0;
        meta.sockets = Number(msg.sockets) || 0;
        evaluateScaling();
        return;
      }

      if (msg.type === 'realtime:emit') {
        for (const [otherId, otherMeta] of workersMeta) {
          if (otherId !== worker.id && !otherMeta.draining) {
            sendSafe(otherMeta.worker, msg);
          }
        }
        return;
      }

      if (msg.type === 'realtime:revoke') {
        for (const [otherId, otherMeta] of workersMeta) {
          if (otherId !== worker.id) {
            sendSafe(otherMeta.worker, msg);
          }
        }
        return;
      }

      if (msg.type === 'realtime:presence') {
        presenceByWorker.set(worker.id, Array.isArray(msg.entries) ? msg.entries : []);
        broadcastGlobalPresence();
        return;
      }

      if (msg.type === 'cache:invalidate') {
        for (const [otherId, otherMeta] of workersMeta) {
          if (otherId !== worker.id && !otherMeta.draining) {
            sendSafe(otherMeta.worker, msg);
          }
        }
      }
    });

    return worker;
  };

  const drainWorker = (meta, reason) => {
    if (!meta || meta.draining) return;
    meta.draining = true;
    presenceByWorker.delete(meta.worker.id);
    broadcastGlobalPresence();
    broadcastClusterState();
    console.log(
      `[cluster] Scaling DOWN worker #${meta.worker.id} (${reason}) — returning to ${countNonDraining()}/${runtime.maxWorkers} active workers`
    );
    sendSafe(meta.worker, { type: 'cluster:drain' });
    meta.forceKillTimer = setTimeout(() => {
      if (!meta.worker.isDead()) {
        meta.worker.kill('SIGTERM');
      }
    }, DRAIN_FORCE_TIMEOUT_MS);
    meta.forceKillTimer.unref?.();
  };

  cluster.on('exit', (worker, code, signal) => {
    const meta = workersMeta.get(worker.id);
    if (meta?.forceKillTimer) clearTimeout(meta.forceKillTimer);
    const wasDraining = Boolean(meta?.draining);
    const wasInitial = Boolean(meta?.isInitial);
    workersMeta.delete(worker.id);
    presenceByWorker.delete(worker.id);
    broadcastGlobalPresence();
    broadcastClusterState();

    if (shuttingDown) {
      if (workersMeta.size === 0) process.exit(0);
      return;
    }

    if (!wasDraining) {
      console.warn(
        `[cluster] Worker #${worker.id} (pid ${worker.process.pid}) exited unexpectedly (${signal || code}) — replacing`
      );
    }

    // Ensure at least `runtime.minWorkers` stay online at all times.
    const current = countNonDraining();
    if (current < runtime.minWorkers) {
      const promoteInitial = wasInitial || current === 0;
      spawnWorker({ isInitial: promoteInitial, reason: 'recovery' });
    }
  });

  const evaluateScaling = () => {
    if (shuttingDown) return;
    const now = Date.now();

    const ready = [];
    for (const meta of workersMeta.values()) {
      if (meta.listening && !meta.draining && !meta.worker.isDead()) {
        ready.push(meta);
      }
    }
    if (ready.length === 0) return;

    const avgElu = ready.reduce((sum, m) => sum + m.elu, 0) / ready.length;
    const maxLagMs = ready.reduce((max, m) => Math.max(max, m.lagMs), 0);
    const totalActiveRequests = ready.reduce((sum, m) => sum + m.activeRequests, 0);
    const avgActiveRequests = totalActiveRequests / ready.length;

    const isStressed =
      avgElu >= runtime.scaleUpElu ||
      maxLagMs >= runtime.scaleUpLagMs ||
      avgActiveRequests >= runtime.scaleUpActiveRequests;

    const isBurst =
      avgElu >= Math.min(0.92, runtime.scaleUpElu + 0.2) ||
      maxLagMs >= runtime.scaleUpLagMs * 2.5 ||
      avgActiveRequests >= runtime.scaleUpActiveRequests * 2;

    if (isStressed) {
      highLoadStreak += 1;
      idleSince = null;

      const totalDesired = countNonDraining();
      const cooldownOk = now - lastScaleUpAt >= SCALE_UP_COOLDOWN_MS;
      if ((highLoadStreak >= 2 || isBurst) && totalDesired < runtime.maxWorkers && cooldownOk) {
        highLoadStreak = 0;
        lastScaleUpAt = now;
        const reason = `ELU ${(avgElu * 100).toFixed(0)}%, lag ${Math.round(maxLagMs)}ms, reqs ${totalActiveRequests}`;
        spawnWorker({ isInitial: false, reason });
      }
      return;
    }

    highLoadStreak = 0;

    // Check if extra workers can scale down when traffic is quiet.
    if (ready.length > runtime.minWorkers) {
      const isQuiet =
        avgElu <= runtime.scaleDownElu &&
        maxLagMs < Math.max(15, runtime.scaleUpLagMs * 0.4) &&
        totalActiveRequests <= runtime.minWorkers * 3;

      if (isQuiet) {
        if (!idleSince) {
          idleSince = now;
        } else if (now - idleSince >= runtime.scaleDownIdleMs) {
          idleSince = now;
          // Pick the secondary worker with the lightest active load & fewest open sockets.
          const candidates = ready
            .filter((m) => !m.isInitial)
            .sort(
              (a, b) =>
                a.activeRequests - b.activeRequests ||
                a.sockets - b.sockets ||
                b.spawnedAt - a.spawnedAt
            );
          const target = candidates[0] || ready[ready.length - 1];
          if (target) {
            drainWorker(target, `idle ELU ${(avgElu * 100).toFixed(0)}%`);
          }
        }
      } else {
        idleSince = null;
      }
    } else {
      idleSince = null;
    }
  };

  // Boot only `minWorkers` (default 1) initially so idle footprint stays minimal.
  console.log(
    `[cluster] Elastic scaler active: starting ${runtime.minWorkers} worker(s), auto-scaling up to ${runtime.maxWorkers} CPU cores on demand (UV_THREADPOOL_SIZE=${runtime.uvThreadpoolSize})`
  );
  for (let i = 0; i < runtime.minWorkers; i += 1) {
    spawnWorker({ isInitial: i === 0, reason: 'boot' });
  }

  // Periodic load evaluation loop.
  const monitorTimer = setInterval(evaluateScaling, SAMPLE_INTERVAL_MS);
  monitorTimer.unref?.();

  const shutdownCluster = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(monitorTimer);
    console.log(`[cluster] Received ${signal} — draining ${workersMeta.size} worker(s)...`);
    if (workersMeta.size === 0) process.exit(0);
    for (const meta of workersMeta.values()) {
      sendSafe(meta.worker, { type: 'cluster:drain' });
    }
    setTimeout(() => process.exit(0), 10_000).unref?.();
  };

  process.once('SIGINT', () => shutdownCluster('SIGINT'));
  process.once('SIGTERM', () => shutdownCluster('SIGTERM'));
}

/**
 * Worker-side telemetry and drain listener.
 * Reports Event Loop Utilization, event-loop delay, and in-flight requests to the Primary.
 */
export function initClusterWorker({ onDrain, getSocketCount = () => 0 } = {}) {
  if (!cluster.isWorker) return;

  let prevElu = performance.eventLoopUtilization();
  let prevCpu = process.cpuUsage();
  let prevHr = process.hrtime.bigint();
  const delayHistogram = monitorEventLoopDelay({ resolution: 20 });
  delayHistogram.enable();

  const metricsTimer = setInterval(() => {
    if (!process.connected) return;
    const nextElu = performance.eventLoopUtilization();
    const delta = performance.eventLoopUtilization(nextElu, prevElu);
    prevElu = nextElu;

    const cpuDelta = process.cpuUsage(prevCpu);
    prevCpu = process.cpuUsage();
    const nowHr = process.hrtime.bigint();
    const elapsedUs = Math.max(1, Number(nowHr - prevHr) / 1000);
    prevHr = nowHr;
    const cpuUtil = Math.min(1, (cpuDelta.user + cpuDelta.system) / elapsedUs);
    const utilization = Math.max(delta.utilization || 0, cpuUtil);

    const p95Ns = delayHistogram.percentile(95);
    const lagMs = Number.isFinite(p95Ns) ? Math.max(0, p95Ns / 1e6 - 20) : 0;
    delayHistogram.reset();

    try {
      process.send?.({
        type: 'worker:metrics',
        elu: Number(utilization.toFixed(3)),
        lagMs: Math.round(lagMs * 10) / 10,
        activeRequests: inFlightRequests,
        sockets: getSocketCount(),
      });
    } catch {
      /* ignore IPC disconnect race */
    }
  }, SAMPLE_INTERVAL_MS);
  metricsTimer.unref?.();

  process.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'cluster:state') {
      activeClusterWorkers = Number(msg.activeWorkers) || 1;
      return;
    }
    if (msg.type === 'cluster:drain') {
      clearInterval(metricsTimer);
      delayHistogram.disable();
      if (typeof onDrain === 'function') {
        void onDrain();
      }
    }
  });
}
