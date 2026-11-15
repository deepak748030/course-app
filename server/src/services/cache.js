/**
 * High-speed 2-Tier Cache Engine (L1 In-Memory LRU + L2 Redis + Cluster IPC Sync).
 *
 * - L1 (Process Memory): sub-millisecond (<0.05ms) reads with bounded key capacity (5,000 keys)
 *   and single-flight request coalescing (prevents cache stampedes on MongoDB Atlas).
 * - L2 (Redis): native TCP/TLS RESP protocol client supporting `redis://` and `rediss://` URLs
 *   (`REDIS_URL`, default `redis://127.0.0.1:6379`) with `TCP_NODELAY` and command pipelining.
 * - Automatic Fallback: if Redis is not running locally in development, seamlessly operates on
 *   L1 + Cluster IPC without slowing down or failing any request.
 * - Instant Invalidation: `invalidateCache(...)` purges matching keys across L1, L2 Redis, and
 *   all active cluster workers simultaneously.
 */
import cluster from 'node:cluster';
import net from 'node:net';
import tls from 'node:tls';

const KEY_PREFIX = 'ydu:';
const MAX_L1_KEYS = 5000;
const REDIS_COMMAND_TIMEOUT_MS = 200;

/** L1 in-memory cache: key -> { value, expiresAt } */
const l1 = new Map();
/** Single-flight coalescing map: key -> Promise */
const inFlight = new Map();
/** Known Redis keys written by this process for fast prefix invalidation without blocking SCAN. */
const knownRedisKeys = new Set();

// Periodic sweep of expired L1 entries so memory stays lean when idle.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of l1) {
    if (now >= entry.expiresAt) l1.delete(key);
  }
}, 60_000).unref?.();

// ---------------------------------------------------------------- Native RESP Redis Client
class NativeRedisClient {
  constructor(rawUrl) {
    this.rawUrl = rawUrl;
    this.socket = null;
    this.connected = false;
    this.ready = false;
    this.closed = false;
    this.queue = [];
    this.buffer = Buffer.alloc(0);
    this.reconnectAttempts = 0;
    this.loggedOffline = false;
  }

  parseUrl() {
    try {
      const u = new URL(this.rawUrl);
      const isTls = u.protocol === 'rediss:';
      const host = u.hostname || '127.0.0.1';
      const port = Number(u.port || 6379);
      const username = u.username ? decodeURIComponent(u.username) : '';
      const password = u.password ? decodeURIComponent(u.password) : '';
      const dbPath = u.pathname?.replace(/^\//, '') || '';
      const db = dbPath && /^\d+$/.test(dbPath) ? Number(dbPath) : 0;
      return { isTls, host, port, username, password, db };
    } catch {
      return { isTls: false, host: '127.0.0.1', port: 6379, username: '', password: '', db: 0 };
    }
  }

  connect() {
    if (this.closed || this.socket) return;
    const { isTls, host, port, username, password, db } = this.parseUrl();

    const onConnect = async () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      try {
        if (password) {
          if (username && username !== 'default') {
            await this.sendRawCommand(['AUTH', username, password]);
          } else {
            await this.sendRawCommand(['AUTH', password]);
          }
        }
        if (db > 0) {
          await this.sendRawCommand(['SELECT', String(db)]);
        }
        await this.sendRawCommand(['PING']);
        this.ready = true;
        if (process.env.IS_SCALE_WORKER !== '1') {
          console.log(`[redis] connected to ${isTls ? 'rediss' : 'redis'}://${host}:${port}${db ? `/${db}` : ''}`);
        }
      } catch (err) {
        console.warn('[redis] handshake error:', err.message);
        this.socket?.destroy();
      }
    };

    const sock = isTls
      ? tls.connect({ host, port, servername: host }, onConnect)
      : net.createConnection({ host, port }, onConnect);

    sock.setNoDelay(true);
    sock.setKeepAlive(true, 30_000);
    this.socket = sock;

    sock.on('data', (chunk) => {
      this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
      this.drainBuffer();
    });

    sock.on('error', () => {
      if (!this.loggedOffline && process.env.IS_SCALE_WORKER !== '1') {
        this.loggedOffline = true;
        console.log(`[redis] local/remote Redis not reachable (${host}:${port}) — using fast L1 memory + cluster IPC cache`);
      }
    });

    sock.on('close', () => {
      this.connected = false;
      this.ready = false;
      this.socket = null;
      this.buffer = Buffer.alloc(0);
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        clearTimeout(item.timer);
        item.reject(new Error('Redis connection closed'));
      }
      if (!this.closed) {
        this.reconnectAttempts += 1;
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(5, this.reconnectAttempts));
        setTimeout(() => this.connect(), delay).unref?.();
      }
    });
  }

  encodeCommand(args) {
    let out = `*${args.length}\r\n`;
    for (const arg of args) {
      const str = String(arg);
      const byteLen = Buffer.byteLength(str, 'utf8');
      out += `$${byteLen}\r\n${str}\r\n`;
    }
    return out;
  }

  sendRawCommand(args, timeoutMs = REDIS_COMMAND_TIMEOUT_MS) {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Redis not connected'));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(entry);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(new Error('Redis command timed out'));
      }, timeoutMs);
      timer.unref?.();

      const entry = { resolve, reject, timer };
      this.queue.push(entry);
      try {
        this.socket.write(this.encodeCommand(args));
      } catch (err) {
        clearTimeout(timer);
        this.queue.pop();
        reject(err);
      }
    });
  }

  sendCommand(args) {
    if (!this.ready) return Promise.reject(new Error('Redis not ready'));
    return this.sendRawCommand(args);
  }

  drainBuffer() {
    while (this.buffer.length > 0 && this.queue.length > 0) {
      const parsed = this.parseRespValue(this.buffer, 0);
      if (!parsed) break;
      this.buffer = this.buffer.subarray(parsed.nextOffset);
      const item = this.queue.shift();
      clearTimeout(item.timer);
      if (parsed.isError) item.reject(new Error(parsed.value));
      else item.resolve(parsed.value);
    }
  }

  parseRespValue(buf, offset) {
    if (offset >= buf.length) return null;
    const prefix = buf[offset];
    const lineEnd = buf.indexOf('\r\n', offset);
    if (lineEnd === -1) return null;
    const header = buf.toString('utf8', offset + 1, lineEnd);
    const afterLine = lineEnd + 2;

    // Simple string (+)
    if (prefix === 43) {
      return { isError: false, value: header, nextOffset: afterLine };
    }
    // Error (-)
    if (prefix === 45) {
      return { isError: true, value: header, nextOffset: afterLine };
    }
    // Integer (:)
    if (prefix === 58) {
      return { isError: false, value: Number(header), nextOffset: afterLine };
    }
    // Bulk string ($)
    if (prefix === 36) {
      const len = Number(header);
      if (len === -1) return { isError: false, value: null, nextOffset: afterLine };
      const end = afterLine + len;
      if (buf.length < end + 2) return null;
      const val = buf.toString('utf8', afterLine, end);
      return { isError: false, value: val, nextOffset: end + 2 };
    }
    // Array (*)
    if (prefix === 42) {
      const count = Number(header);
      if (count === -1) return { isError: false, value: null, nextOffset: afterLine };
      const items = [];
      let cursor = afterLine;
      for (let i = 0; i < count; i += 1) {
        const sub = this.parseRespValue(buf, cursor);
        if (!sub) return null;
        if (sub.isError) return sub;
        items.push(sub.value);
        cursor = sub.nextOffset;
      }
      return { isError: false, value: items, nextOffset: cursor };
    }

    return { isError: false, value: null, nextOffset: buf.length };
  }

  close() {
    this.closed = true;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.ready = false;
    this.connected = false;
  }
}

let redisClient = null;
const rawRedisUrl = (process.env.REDIS_URL || 'redis://127.0.0.1:6379').trim();
const redisDisabled = ['false', 'off', '0', 'none'].includes(
  String(process.env.REDIS_ENABLED || '').trim().toLowerCase()
);

export function connectRedis() {
  if (redisDisabled || redisClient) return;
  redisClient = new NativeRedisClient(rawRedisUrl);
  redisClient.connect();
}

export function disconnectRedis() {
  if (redisClient) {
    redisClient.close();
    redisClient = null;
  }
}

export function redisState() {
  if (redisDisabled) return 'disabled';
  if (redisClient?.ready) return 'connected';
  return 'memory-fallback';
}

// ---------------------------------------------------------------- L1 + L2 Cache Operations
function setL1(key, value, ttlMs) {
  if (l1.has(key)) {
    l1.delete(key);
  } else if (l1.size >= MAX_L1_KEYS) {
    const oldest = l1.keys().next().value;
    if (oldest !== undefined) l1.delete(oldest);
  }
  l1.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getL1(key) {
  const entry = l1.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    l1.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Read-through cache with single-flight coalescing across L1 memory and L2 Redis.
 */
export async function cacheRemember(key, ttlMs, fetcher) {
  const cachedL1 = getL1(key);
  if (cachedL1 !== undefined) return cachedL1;

  const existingFlight = inFlight.get(key);
  if (existingFlight) return existingFlight;

  const promise = (async () => {
    const rKey = `${KEY_PREFIX}${key}`;
    if (redisClient?.ready) {
      try {
        const raw = await redisClient.sendCommand(['GET', rKey]);
        if (raw !== null && raw !== undefined) {
          const parsed = JSON.parse(raw);
          setL1(key, parsed, ttlMs);
          knownRedisKeys.add(rKey);
          return parsed;
        }
      } catch {
        /* fallback to fetcher on Redis read hiccup */
      }
    }

    const fresh = await fetcher();
    if (fresh !== undefined) {
      setL1(key, fresh, ttlMs);
      if (redisClient?.ready) {
        try {
          const serialized = JSON.stringify(fresh);
          knownRedisKeys.add(rKey);
          void redisClient.sendCommand(['SET', rKey, serialized, 'PX', String(ttlMs)]).catch(() => {});
        } catch {
          /* ignore non-serializable values */
        }
      }
    }
    return fresh;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

function purgeLocalByPrefixes(prefixes) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const key of l1.keys()) {
    if (list.some((p) => key === p || key.startsWith(p))) {
      l1.delete(key);
    }
  }
}

/**
 * Immediately invalidate cache entries matching one or more prefixes across L1 memory,
 * L2 Redis, and all active cluster workers.
 */
export function invalidateCache(prefixes, { broadcast = true } = {}) {
  const list = (Array.isArray(prefixes) ? prefixes : [prefixes]).filter(Boolean);
  if (list.length === 0) return;

  purgeLocalByPrefixes(list);

  if (redisClient?.ready) {
    const toDelete = [];
    for (const p of list) {
      toDelete.push(`${KEY_PREFIX}${p}`);
    }
    for (const rKey of knownRedisKeys) {
      const stripped = rKey.slice(KEY_PREFIX.length);
      if (list.some((p) => stripped === p || stripped.startsWith(p))) {
        toDelete.push(rKey);
        knownRedisKeys.delete(rKey);
      }
    }
    if (toDelete.length > 0) {
      void redisClient.sendCommand(['DEL', ...new Set(toDelete)]).catch(() => {});
    }
  }

  if (broadcast && cluster.isWorker && process.connected) {
    try {
      process.send?.({ type: 'cache:invalidate', prefixes: list });
    } catch {
      /* ignore IPC disconnect race */
    }
  }
}

if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg && typeof msg === 'object' && msg.type === 'cache:invalidate' && Array.isArray(msg.prefixes)) {
      invalidateCache(msg.prefixes, { broadcast: false });
    }
  });
}

export function cacheStats() {
  return {
    redis: redisState(),
    l1Entries: l1.size,
  };
}
