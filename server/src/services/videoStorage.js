/**
 * Course video storage on Backblaze B2 (S3-compatible API). The bucket stays PRIVATE.
 *
 *  - Upload: the admin dashboard sends the video to this server, which streams it to B2 with the
 *    server's restricted key. The browser never talks to B2, so no bucket CORS setup is needed.
 *  - Playback: when an enrolled learner (or a free-preview lesson) opens a lesson, the server signs a
 *    short-lived GET URL for that one object. Nothing in the bucket is public.
 *
 * Required env (see .env.example):
 *   B2_S3_ENDPOINT      e.g. https://s3.us-west-004.backblazeb2.com
 *   B2_KEY_ID           application key id (restricted to this bucket)
 *   B2_APPLICATION_KEY  application key secret
 *   B2_BUCKET           bucket name (Private)
 */
import '../config/env.js';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Accepts `s3.us-west-004.backblazeb2.com`, `https://s3.us-west-004.backblazeb2.com` or a value with a
 * trailing bucket path, and reduces it to `https://<host>`. Anything else counts as not configured.
 */
function normalizeEndpoint(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!/^s3\.[a-z0-9-]+\.backblazeb2\.com$/i.test(url.hostname)) return '';
    return `https://${url.hostname}`;
  } catch {
    return '';
  }
}

const endpoint = normalizeEndpoint(process.env.B2_S3_ENDPOINT);
const bucket = process.env.B2_BUCKET || '';
const accessKeyId = process.env.B2_KEY_ID || '';
const secretAccessKey = process.env.B2_APPLICATION_KEY || '';

export const videoStorageConfigured = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);

/** Human-readable reason when storage is not usable (used in the 503 message). */
export function videoStorageProblem() {
  if (videoStorageConfigured) return null;
  if (!endpoint && process.env.B2_S3_ENDPOINT) return 'B2_S3_ENDPOINT must look like s3.us-west-004.backblazeb2.com';
  return 'Set B2_S3_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY and B2_BUCKET in server/.env, then restart the server';
}

/** Allowed video types and the file extension each one must end with. */
export const VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** Largest single video accepted. */
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;

/** Playback links last long enough for a full lesson, then the app asks again. */
export const PLAYBACK_TTL_SECONDS = 6 * 60 * 60;

let client = null;
function s3() {
  if (!client) {
    // B2's S3 region is part of the endpoint host, e.g. s3.us-west-004.backblazeb2.com → us-west-004.
    const region = endpoint.match(/s3\.([^.]+)\.backblazeb2\.com/)?.[1] || 'us-west-004';
    client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      // Newer SDKs add checksums by default; compatibility with B2 is better without them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

function buildVideoKey({ courseKey, fileName, contentType, quality }) {
  const ext = VIDEO_TYPES[contentType];
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'lesson';
  const label = quality ? `${quality}p-` : '';
  return `courses/${courseKey}/${randomUUID()}-${label}${base}.${ext}`;
}

/** Available lesson video qualities, highest first in the admin UI. */
export const VIDEO_QUALITIES = ['360', '480', '720', '1080'];

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

/**
 * Streams a video file from local disk into the private bucket. Returns the object key, which the
 * lesson stores. The caller is responsible for deleting the local temp file afterwards.
 */
/**
 * Progress of uploads in flight, keyed by the id the browser sends in X-Upload-Id. The storage
 * stage reports the bytes the SDK has pulled from the temp file, which is what is being sent to B2.
 */
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

export async function storeVideo({ courseKey, filePath, fileName, contentType, size, quality, progressId }) {
  const key = buildVideoKey({ courseKey, fileName, contentType, quality });
  let sent = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      sent += chunk.length;
      setUploadProgress(progressId, { stage: 'storing', sent, total: size });
      callback(null, chunk);
    },
  });
  setUploadProgress(progressId, { stage: 'storing', sent: 0, total: size });
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath).pipe(counter),
        ContentType: contentType,
        ContentLength: size,
      })
    );
  } catch (err) {
    setUploadProgress(progressId, { stage: 'failed', sent, total: size });
    forgetUploadProgressLater(progressId);
    throw err;
  }
  setUploadProgress(progressId, { stage: 'done', sent: size, total: size });
  forgetUploadProgressLater(progressId);
  return key;
}

/**
 * Signs a temporary GET URL for one stored video. The bucket itself stays private.
 * The signing time is snapped to 6-hour windows and the link lasts two windows, so a lesson gets the
 * same URL for the whole window. The app caches video by URL; a changing URL would throw that cache away.
 */
const PLAYBACK_WINDOW_SECONDS = 6 * 60 * 60;
export async function createVideoPlaybackUrl(key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const signingDate = new Date(Math.floor(Date.now() / 1000 / PLAYBACK_WINDOW_SECONDS) * PLAYBACK_WINDOW_SECONDS * 1000);
  return getSignedUrl(s3(), command, { expiresIn: PLAYBACK_WINDOW_SECONDS * 2, signingDate });
}
