/**
 * Server-side local image uploads.
 *
 * All uploaded images (course covers, home banners, learner profile photos) are stored on the
 * server inside the `uploads/` directory (`UPLOAD_DIR`, defaulting to `server/uploads`) and
 * served from `/uploads/...`.
 *
 * Returned URLs are always server-relative (`/uploads/covers/...`, `/uploads/avatars/...`), so
 * changing the server domain or port never breaks previously uploaded media.
 *
 * Learners' profile photos are personal data: `deleteAvatarImage` removes one when its account is
 * deleted or the photo is replaced.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');
const UPLOAD_DIR = process.env.UPLOAD_DIR?.trim()
  ? path.resolve(process.env.UPLOAD_DIR.trim())
  : DEFAULT_UPLOAD_DIR;

export const uploadsProvider = 'local';
export const uploadDir = UPLOAD_DIR;

/** Where learners' profile photos go (see routes/uploads.routes.js). */
export const AVATAR_FOLDER = 'avatars';

export const IMAGE_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/** Checks basic image file headers so spoofed non-image files (e.g. HTML) cannot be saved. */
export function isValidImageBuffer(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  switch (mimetype) {
    case 'image/jpeg':
    case 'image/jpg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case 'image/gif':
      return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
    case 'image/webp':
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'image/avif':
      return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
    default:
      return false;
  }
}

/** Sanitizes the target folder into a single safe subdirectory name (never 'videos' or dotfiles). */
export function safeImageFolder(folder) {
  const segment = String(folder || 'covers').split('/').pop() || 'covers';
  if (segment.startsWith('.')) return 'covers';
  const cleaned = segment.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleaned || cleaned === 'videos' || cleaned === 'tmp') return 'covers';
  return cleaned;
}

/**
 * Strips the origin from an absolute `/uploads/...` URL pointing at our image folders so DB records
 * stay server-URL-independent (e.g. `https://old.host/uploads/covers/a.jpg` → `/uploads/covers/a.jpg`).
 */
export function normalizeUploadUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (/^\/uploads\/(?:avatars|covers|banners|images)\/[\w.-]+$/i.test(parsed.pathname)) {
        return parsed.pathname;
      }
    } catch {
      /* leave invalid URLs untouched */
    }
  }
  return trimmed;
}

export async function storeImage(buffer, { folder = 'covers', mimetype = 'image/jpeg' } = {}) {
  const subdir = safeImageFolder(folder);
  const ext = IMAGE_MIME_TYPES[mimetype] || '.jpg';
  const dir = path.join(UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(dir, name), buffer);
  const key = `${subdir}/${name}`;
  return { url: `/uploads/${key}`, publicId: key, provider: 'local' };
}

/**
 * Resolves a stored avatar URL pointing to `/uploads/avatars/...` to its local file path, or null
 * when it is not a local avatar file (prevents deleting course covers, banners, or external URLs).
 */
export function avatarTarget(url) {
  if (typeof url !== 'string' || !url) return null;
  let pathname = url;
  if (/^https?:\/\//i.test(url)) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  const local = pathname.match(/^\/uploads\/avatars\/([\w-]+\.[a-z0-9]{1,5})$/i);
  return local ? { provider: 'local', file: path.join(UPLOAD_DIR, 'avatars', local[1]) } : null;
}

/** Deletes a learner's profile photo from server disk. Returns true when a file was removed. */
export async function deleteAvatarImage(url) {
  const target = avatarTarget(url);
  if (!target) return false;
  try {
    await unlink(target.file);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}
