/**
 * On-demand elastic Worker-Thread pool for CPU-intensive tasks (e.g. bcrypt hashing/verification).
 *
 * - Idle footprint: 0 worker threads (no background memory or CPU wasted when idle).
 * - Under load: spawns up to `runtime.cpuPoolMaxThreads` threads on demand across CPU cores so
 *   heavy synchronous/CPU-bound work never blocks the Express/Socket.IO event loop.
 * - Scale-down: each worker thread automatically terminates after `runtime.cpuPoolIdleTtlMs` (30s)
 *   of inactivity, returning the pool back to 0 threads.
 */
import crypto from 'node:crypto';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { runtime } from '../config/runtime.js';

let bcryptCache = null;
async function getBcrypt() {
  if (!bcryptCache) {
    const mod = await import('bcryptjs');
    bcryptCache = mod.default ?? mod;
  }
  return bcryptCache;
}

async function executeTask(op, payload) {
  switch (op) {
    case 'bcrypt:hash': {
      const bcrypt = await getBcrypt();
      return bcrypt.hash(String(payload.password ?? ''), Number(payload.rounds ?? 10));
    }
    case 'bcrypt:compare': {
      const bcrypt = await getBcrypt();
      return bcrypt.compare(String(payload.password ?? ''), String(payload.hash ?? ''));
    }
    case 'crypto:scrypt': {
      const buf = crypto.scryptSync(
        String(payload.input ?? ''),
        String(payload.salt ?? 'salt'),
        Number(payload.keylen ?? 32)
      );
      return buf.toString('hex');
    }
    default:
      throw new Error(`Unsupported CPU pool task: ${op}`);
  }
}

// ---------------------------------------------------------------- Worker thread entrypoint
if (!isMainThread && parentPort) {
  parentPort.on('message', async (msg) => {
    const { id, op, payload } = msg || {};
    try {
      const result = await executeTask(op, payload);
      parentPort.postMessage({ id, ok: true, result });
    } catch (err) {
      parentPort.postMessage({ id, ok: false, error: err?.message || 'Worker task failed' });
    }
  });
}

// ---------------------------------------------------------------- Main thread pool manager
const MAX_QUEUE = 250;
const slots = new Set();
const queue = [];
let nextTaskId = 1;

function clearIdleTimer(slot) {
  if (slot.idleTimer) {
    clearTimeout(slot.idleTimer);
    slot.idleTimer = null;
  }
}

function scheduleIdleTermination(slot) {
  clearIdleTimer(slot);
  slot.idleTimer = setTimeout(() => {
    if (!slot.busy) {
      slots.delete(slot);
      slot.worker.terminate().catch(() => {});
    }
  }, runtime.cpuPoolIdleTtlMs);
  slot.idleTimer.unref?.();
}

function createSlot() {
  const worker = new Worker(new URL(import.meta.url), { execArgv: [] });
  worker.unref();
  const slot = {
    worker,
    busy: false,
    currentTask: null,
    idleTimer: null,
  };

  worker.on('message', (msg) => {
    const task = slot.currentTask;
    slot.currentTask = null;
    slot.busy = false;
    if (task) {
      if (msg?.ok) task.resolve(msg.result);
      else task.reject(new Error(msg?.error || 'CPU worker error'));
    }
    pumpQueue(slot);
  });

  worker.on('error', (err) => {
    slots.delete(slot);
    clearIdleTimer(slot);
    const task = slot.currentTask;
    slot.currentTask = null;
    slot.busy = false;
    if (task) {
      // Fallback to in-thread execution if a worker crashes mid-task.
      executeTask(task.op, task.payload).then(task.resolve, task.reject);
    }
    pumpQueue();
    if (err) console.warn('[cpu-pool] worker error, fell back cleanly:', err.message);
  });

  worker.on('exit', () => {
    slots.delete(slot);
    clearIdleTimer(slot);
    const task = slot.currentTask;
    slot.currentTask = null;
    slot.busy = false;
    if (task) {
      executeTask(task.op, task.payload).then(task.resolve, task.reject);
    }
  });

  slots.add(slot);
  return slot;
}

function dispatchToSlot(slot, task) {
  clearIdleTimer(slot);
  slot.busy = true;
  slot.currentTask = task;
  slot.worker.postMessage({ id: task.id, op: task.op, payload: task.payload });
}

function pumpQueue(preferredSlot = null) {
  if (queue.length === 0) {
    if (preferredSlot && slots.has(preferredSlot) && !preferredSlot.busy) {
      scheduleIdleTermination(preferredSlot);
    }
    return;
  }

  let slot = preferredSlot && slots.has(preferredSlot) && !preferredSlot.busy ? preferredSlot : null;
  if (!slot) {
    for (const candidate of slots) {
      if (!candidate.busy) {
        slot = candidate;
        break;
      }
    }
  }
  if (!slot && slots.size < runtime.cpuPoolMaxThreads) {
    try {
      slot = createSlot();
    } catch {
      slot = null;
    }
  }

  if (slot) {
    const nextTask = queue.shift();
    dispatchToSlot(slot, nextTask);
  }
}

/**
 * Run a CPU-bound operation on an on-demand worker thread.
 * Spawns threads lazily when needed and scales back to 0 threads after idle timeout.
 */
export function runCpuTask(op, payload) {
  if (!isMainThread) {
    return executeTask(op, payload);
  }

  return new Promise((resolve, reject) => {
    const task = { id: nextTaskId++, op, payload, resolve, reject };

    for (const slot of slots) {
      if (!slot.busy) {
        dispatchToSlot(slot, task);
        return;
      }
    }

    if (slots.size < runtime.cpuPoolMaxThreads) {
      try {
        const slot = createSlot();
        dispatchToSlot(slot, task);
        return;
      } catch {
        // Worker creation restricted — execute in-process without failing.
        executeTask(op, payload).then(resolve, reject);
        return;
      }
    }

    if (queue.length >= MAX_QUEUE) {
      executeTask(op, payload).then(resolve, reject);
      return;
    }

    queue.push(task);
  });
}

/** Offload bcrypt password hashing to the elastic CPU worker pool. */
export function hashPassword(password, rounds = 10) {
  return runCpuTask('bcrypt:hash', { password, rounds });
}

/** Offload bcrypt password comparison to the elastic CPU worker pool. */
export function verifyPassword(password, hash) {
  return runCpuTask('bcrypt:compare', { password, hash });
}

/** Live telemetry for `/api/health`. */
export function cpuPoolStats() {
  let busyThreads = 0;
  for (const slot of slots) {
    if (slot.busy) busyThreads += 1;
  }
  return {
    activeThreads: slots.size,
    busyThreads,
    queuedTasks: queue.length,
    maxThreads: runtime.cpuPoolMaxThreads,
  };
}

/** Terminate all worker threads immediately on server shutdown. */
export async function shutdownCpuPool() {
  const terminationPromises = [];
  for (const slot of slots) {
    clearIdleTimer(slot);
    terminationPromises.push(slot.worker.terminate().catch(() => {}));
  }
  slots.clear();
  await Promise.allSettled(terminationPromises);
}
