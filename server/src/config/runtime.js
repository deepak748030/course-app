import os from 'node:os';

const detectedCores = Math.max(
  1,
  typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus()?.length || 1
);
const totalMemoryMb = Math.round(os.totalmem() / (1024 * 1024));

// Scale libuv's internal C++ threadpool (used on-demand for fs streams, gzip compression, and crypto)
// before any async I/O runs. Libuv threads sleep at 0% CPU when idle and wake up across all cores only when needed.
const defaultUvThreads = Math.min(64, Math.max(4, detectedCores * 4));
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = String(defaultUvThreads);
}

const clampInt = (raw, fallback, min, max) => {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const clampFloat = (raw, fallback, min, max) => {
  const n = Number.parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const rawClusterMode = String(process.env.CLUSTER_MODE || 'auto').trim().toLowerCase();
const clusterMode = ['auto', 'on', 'off', 'true', 'false', '1', '0'].includes(rawClusterMode)
  ? rawClusterMode
  : 'auto';

const maxWorkers = clampInt(
  process.env.MAX_WORKERS,
  detectedCores,
  1,
  Math.max(detectedCores * 2, 64)
);

const minWorkers = clampInt(
  process.env.MIN_WORKERS,
  1,
  1,
  maxWorkers
);

export const runtime = {
  cpuCores: detectedCores,
  totalMemoryMb,
  uvThreadpoolSize: clampInt(process.env.UV_THREADPOOL_SIZE, defaultUvThreads, 1, 128),
  /** 'auto' (multi-core elastic cluster unless running under --watch), 'on', or 'off'. */
  clusterMode,
  /** Start with 1 worker when idle so no extra RAM/CPU is consumed unnecessarily. */
  minWorkers,
  /** Scale up to all available CPU cores when traffic/CPU load spikes. */
  maxWorkers,
  /** Event Loop Utilization (0..1) above which the primary spawns another worker. */
  scaleUpElu: clampFloat(process.env.SCALE_UP_ELU, 0.65, 0.25, 0.95),
  /** Event Loop Utilization (0..1) below which extra workers are eligible to scale down. */
  scaleDownElu: clampFloat(process.env.SCALE_DOWN_ELU, 0.2, 0.05, 0.6),
  /** Event loop p95 lag (ms) that also triggers scale-up under burst load. */
  scaleUpLagMs: clampInt(process.env.SCALE_UP_LAG_MS, 45, 10, 500),
  /** Concurrent in-flight HTTP requests per worker that also triggers scale-up. */
  scaleUpActiveRequests: clampInt(process.env.SCALE_UP_ACTIVE_REQUESTS, 25, 5, 500),
  /** Seconds of continuous low load before an extra worker gracefully drains & exits. */
  scaleDownIdleMs: clampInt(process.env.SCALE_DOWN_IDLE_SECONDS, 45, 10, 3600) * 1000,
  /** Max on-demand worker_threads per process for heavy CPU tasks (0 threads kept when idle). */
  cpuPoolMaxThreads: clampInt(
    process.env.CPU_POOL_MAX_THREADS,
    Math.max(1, detectedCores - 1),
    1,
    32
  ),
  /** Idle TTL (ms) after which on-demand CPU worker_threads terminate back to 0. */
  cpuPoolIdleTtlMs: clampInt(process.env.CPU_POOL_IDLE_SECONDS, 30, 5, 600) * 1000,
  /** Elastic MongoDB pool per worker: stays at 1 idle socket, bursts up to maxPoolSize when busy. */
  mongoMinPoolSize: clampInt(process.env.MONGO_MIN_POOL_SIZE, 1, 0, 20),
  mongoMaxPoolSize: clampInt(
    process.env.MONGO_MAX_POOL_SIZE,
    Math.min(100, Math.max(10, detectedCores * 8)),
    5,
    200
  ),
  mongoMaxIdleTimeMs: clampInt(process.env.MONGO_MAX_IDLE_SECONDS, 60, 10, 600) * 1000,
};
