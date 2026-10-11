/**
 * Course video storage on Backblaze B2 (S3-compatible API). The bucket stays PRIVATE.
 *
 *  - Upload: the admin dashboard gets a short-lived signed PUT URL and sends the file straight to B2.
 *    The video bytes never pass through this server.
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
import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Accepts `s3.us-west-004.backblazeb2.com`, `https://s3.us-west-004.backblazeb2.com` or a value with a
 * trailing bucket path, and reduces it to `https://<host>`. Anything else is reported as not configured.
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

/** Largest single video accepted (one PUT). */
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;

/** Upload links are short-lived. */
const UPLOAD_TTL_SECONDS = 60 * 60;
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
    });
  }
  return client;
}

/**
 * Signs a PUT URL for one new object. Returns the object key (saved on the lesson) and the URL the
 * browser uploads to.
 */
export async function createVideoUploadUrl({ courseKey, fileName, contentType, size }) {
  const ext = VIDEO_TYPES[contentType];
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'lesson';
  const key = `courses/${courseKey}/${randomUUID()}-${base}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });
  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { uploadUrl, key, expiresIn: UPLOAD_TTL_SECONDS };
}

/** Signs a temporary GET URL for one stored video. The bucket itself stays private. */
export async function createVideoPlaybackUrl(key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3(), command, { expiresIn: PLAYBACK_TTL_SECONDS });
}
