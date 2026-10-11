/**
 * Course video storage on Backblaze B2 (S3-compatible API).
 *
 * The admin dashboard never sends video bytes through this server. The server only signs a
 * short-lived PUT URL for one object key; the browser uploads straight to B2 and the lesson then
 * stores the public URL.
 *
 * Required env (see .env.example):
 *   B2_S3_ENDPOINT        e.g. https://s3.us-west-004.backblazeb2.com  (shown on the bucket page)
 *   B2_KEY_ID             application key id (restricted key, bucket-scoped)
 *   B2_APPLICATION_KEY    application key secret
 *   B2_BUCKET             bucket name
 *   B2_PUBLIC_BASE_URL    e.g. https://f004.backblazeb2.com/file/<bucket>  (or your CDN domain)
 */
import '../config/env.js';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = (process.env.B2_S3_ENDPOINT || '').replace(/\/+$/, '');
const bucket = process.env.B2_BUCKET || '';
const accessKeyId = process.env.B2_KEY_ID || '';
const secretAccessKey = process.env.B2_APPLICATION_KEY || '';
const publicBaseUrl = (process.env.B2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

export const videoStorageConfigured = Boolean(endpoint && bucket && accessKeyId && secretAccessKey && publicBaseUrl);

/** Allowed video types and the file extension each one must end with. */
export const VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** Largest single video accepted (one PUT). */
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;

const URL_TTL_SECONDS = 60 * 60;

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
 * Signs a PUT URL for one new object. Returns the URL the browser uploads to, and the public URL
 * the lesson will play from.
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
  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: URL_TTL_SECONDS });
  return { uploadUrl, key, publicUrl: `${publicBaseUrl}/${key}`, expiresIn: URL_TTL_SECONDS };
}
