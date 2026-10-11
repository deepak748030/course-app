/**
 * Course video storage on Cloudflare R2 (S3-compatible, free tier: 10 GB storage, no egress fees).
 *
 * The admin dashboard never sends video bytes through this server. The server only signs a
 * short-lived PUT URL for one object key; the browser uploads straight to R2 and then stores the
 * public URL on the lesson.
 *
 * Required env (see .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 */
import '../config/env.js';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID || '';
const bucket = process.env.R2_BUCKET || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

export const r2Configured = Boolean(accountId && bucket && accessKeyId && secretAccessKey && publicBaseUrl);

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
function r2() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
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
  const uploadUrl = await getSignedUrl(r2(), command, { expiresIn: URL_TTL_SECONDS });
  return { uploadUrl, key, publicUrl: `${publicBaseUrl}/${key}`, expiresIn: URL_TTL_SECONDS };
}
