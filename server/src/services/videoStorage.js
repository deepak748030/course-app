/**
 * Server-side local course video storage inside `uploads/videos/`.
 *
 * - Upload: the admin dashboard sends the video directly to this server, which stores it under
 *   `<UPLOAD_DIR>/videos/courses/<courseId>/...` (no third-party cloud bucket needed).
 * - Security: `/uploads/videos` is blocked from public static serving. When an enrolled learner
 *   (or a free-preview lesson) opens a lesson, the server signs a short-lived HMAC playback path
 *   (`/api/videos/stream?key=...&exp=...&sig=...`) that streams with full HTTP Range (`206`)
 *   support so mobile players can scrub and seek smoothly.
 * - Server URL changes: lessons only store the relative `videoKey` (`courses/...`), and the
 *   playback API returns a relative `/api/videos/stream?...` path that the app resolves against
 *   its current server URL — so moving the server never breaks stored videos.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { uploadDir } from './uploads.js';

export const VIDEO_UPLOAD_DIR = path.join(uploadDir, 'videos');
export const VIDEO_TMP_DIR = path.join(uploadDir, '.tmp');

export const videoStorageConfigured = true;
export function videoStorageProblem() {
  return null;
}

/** Allowed video types and the file extension each one must end with. */
export const VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const EXT_TO_MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

/** Largest single video accepted (default 4 GB, overridable via MAX_VIDEO_BYTES). */
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES) || 4 * 1024 * 1024 * 1024;

/** Playback links stay valid across two 6-hour windows so expo-video's URL cache keeps working. */
const PLAYBACK_WINDOW_SECONDS = 6 * 60 * 60;
export const PLAYBACK_TTL_SECONDS = PLAYBACK_WINDOW_SECONDS;

/** Available lesson video qualities, highest first in the admin UI. */
export const VIDEO_QUALITIES = ['360', '480', '720', '1080'];

export async function ensureVideoDirs() {
  await Promise.all([
    fsPromises.mkdir(VIDEO_UPLOAD_DIR, { recursive: true }),
    fsPromises.mkdir(VIDEO_TMP_DIR, { recursive: true }),
  ]);
  // Sweep stale temp uploads left behind if the server restarted mid-upload.
  const stale = await fsPromises.readdir(VIDEO_TMP_DIR).catch(() => []);
  await Promise.all(
    stale.map((name) => fsPromises.rm(path.join(VIDEO_TMP_DIR, name), { recursive: true, force: true }).catch(() => {}))
  );
}

function buildVideoKey({ courseKey, fileName, contentType, quality }) {
  const safeCourseKey = String(courseKey || 'drafts').replace(/[^a-zA-Z0-9_-]/g, '') || 'drafts';
  const ext = VIDEO_TYPES[contentType] || 'mp4';
  const base =
    String(fileName || 'lesson')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 60) || 'lesson';
  const label = quality ? `${quality}p-` : '';
  return `courses/${safeCourseKey}/${crypto.randomUUID()}-${label}${base}.${ext}`;
}

/**
 * Resolves a stored `videoKey` (`courses/<courseKey>/<filename>`) to an absolute file path inside
 * `VIDEO_UPLOAD_DIR`, or null when the key is malformed or attempts path traversal.
 */
export function resolveVideoFilePath(key) {
  if (typeof key !== 'string' || !/^courses\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(key)) {
    return null;
  }
  const abs = path.resolve(VIDEO_UPLOAD_DIR, key);
  const root = path.resolve(VIDEO_UPLOAD_DIR);
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}

export function videoMimeType(key) {
  const ext = path.extname(String(key || '')).toLowerCase();
  return EXT_TO_MIME[ext] || 'video/mp4';
}

export async function videoFileExists(key) {
  const abs = resolveVideoFilePath(key);
  if (!abs) return false;
  try {
    const stat = await fsPromises.stat(abs);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * A lesson's playable videos, best quality first. Lessons that were uploaded before qualities existed
 * keep their single `videoKey` and are returned as quality 'original'.
 */
export function lessonVideos(lesson) {
  const list = (lesson?.videos || [])
    .filter((v) => v?.videoKey && VIDEO_QUALITIES.includes(String(v.quality)))
    .map((v) => ({ quality: String(v.quality), key: v.videoKey }))
    .sort((a, b) => Number(b.quality) - Number(a.quality));
  if (!list.length && lesson?.videoKey) return [{ quality: 'original', key: lesson.videoKey }];
  return list;
}

/** Picks the requested quality, or the closest lower one that exists. No request = best available. */
export function pickLessonVideo(lesson, quality) {
  const list = lessonVideos(lesson);
  if (!list.length) return null;
  if (!quality || !VIDEO_QUALITIES.includes(String(quality))) return list[0];
  const want = Number(quality);
  return list.find((v) => Number(v.quality) <= want) || list[list.length - 1];
}

/** Progress of uploads in flight, keyed by X-Upload-Id. */
const uploadProgress = new Map();

export function setUploadProgress(id, entry) {
  if (!id) return;
  uploadProgress.set(id, { ...entry, updatedAt: Date.now() });
}

export function getUploadProgress(id) {
  return uploadProgress.get(id) || null;
}

function forgetUploadProgressLater(id) {
  if (!id) return;
  setTimeout(() => uploadProgress.delete(id), 60_000).unref();
}

async function copyFileWithProgress(src, dest, size, progressId) {
  await new Promise((resolve, reject) => {
    let sent = 0;
    const reader = fs.createReadStream(src);
    const writer = fs.createWriteStream(dest);
    reader.on('data', (chunk) => {
      sent += chunk.length;
      setUploadProgress(progressId, { stage: 'storing', sent, total: size });
    });
    reader.on('error', reject);
    writer.on('error', reject);
    writer.on('finish', resolve);
    reader.pipe(writer);
  });
}

/**
 * Moves (or streams on cross-device mounts) the uploaded temp video into `<UPLOAD_DIR>/videos/...`
 * and returns the stored relative `videoKey`. Caller cleans up `filePath` if still present.
 */
export async function storeVideo({ courseKey, filePath, fileName, contentType, size, quality, progressId }) {
  const key = buildVideoKey({ courseKey, fileName, contentType, quality });
  const destPath = resolveVideoFilePath(key);
  if (!destPath) throw new Error('Invalid destination video key');

  await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
  setUploadProgress(progressId, { stage: 'storing', sent: 0, total: size });

  try {
    try {
      await fsPromises.rename(filePath, destPath);
    } catch (err) {
      if (err?.code === 'EXDEV') {
        await copyFileWithProgress(filePath, destPath, size, progressId);
        await fsPromises.rm(filePath, { force: true }).catch(() => {});
      } else {
        throw err;
      }
    }
    setUploadProgress(progressId, { stage: 'done', sent: size, total: size });
    forgetUploadProgressLater(progressId);
    return key;
  } catch (err) {
    setUploadProgress(progressId, { stage: 'failed', sent: 0, total: size });
    forgetUploadProgressLater(progressId);
    throw err;
  }
}

/** Collects every `videoKey` referenced by an array of lessons. */
export function collectLessonVideoKeys(lessons = []) {
  const keys = new Set();
  for (const lesson of lessons) {
    if (lesson?.videoKey) keys.add(lesson.videoKey);
    for (const v of lesson?.videos || []) {
      if (v?.videoKey) keys.add(v.videoKey);
    }
  }
  return keys;
}

/** Deletes a stored video file from `<UPLOAD_DIR>/videos/`. Never throws on missing files. */
export async function deleteVideoFile(key) {
  const abs = resolveVideoFilePath(key);
  if (!abs) return false;
  try {
    await fsPromises.unlink(abs);
    return true;
  } catch (err) {
    if (err?.code === 'ENOENT') return false;
    throw err;
  }
}

function signPlaybackToken(key, exp) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`${key}:${exp}`).digest('hex');
}

/**
 * Builds a signed relative playback path (`/api/videos/stream?...`) valid across two 6-hour windows.
 * Relative paths let the mobile app prepend its current server URL even if the server moved.
 */
export function createVideoPlaybackUrl(key) {
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = (Math.floor(nowSec / PLAYBACK_WINDOW_SECONDS) + 2) * PLAYBACK_WINDOW_SECONDS;
  const sig = signPlaybackToken(key, exp);
  const params = new URLSearchParams({ key, exp: String(exp), sig });
  return `/api/videos/stream?${params.toString()}`;
}

/** Constant-time verification of a signed playback URL. */
export function verifyVideoPlaybackSignature(key, expRaw, sigRaw) {
  if (!resolveVideoFilePath(key)) return false;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  const sig = String(sigRaw || '');
  if (!/^[a-f0-9]{64}$/i.test(sig)) return false;
  const expected = signPlaybackToken(key, exp);
  const a = Buffer.from(sig.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
