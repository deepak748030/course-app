/**
 * Image uploads.
 *
 * Preferred: Cloudinary — set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)
 * and every upload lands on the CDN with a responsive delivery URL.
 *
 * Fallback (no Cloudinary configured): files are stored in server/uploads and served
 * from /uploads, so the whole flow still works in plain development. Each folder gets its own
 * directory (uploads/avatars, uploads/covers, …), the way Cloudinary keeps them apart.
 *
 * Learners' profile photos are personal data: deleteAvatarImage removes one when its account is
 * deleted or the photo is replaced, which the privacy policy and /legal/delete-account promise.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

const configured = Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const uploadsProvider = configured ? 'cloudinary' : 'local';

/** Where learners' profile photos go (see routes/uploads.routes.js). */
export const AVATAR_FOLDER = 'ydu-academy/avatars';

/** The local sub-directory for a folder: its last segment, e.g. ydu-academy/avatars → avatars. */
function localSubdir(folder) {
  if (!folder.includes('/')) return '';
  return folder.split('/').pop().replace(/[^\w-]/g, '');
}

export async function storeImage(buffer, { folder = 'ydu-academy', originalName = '' } = {}) {
  if (configured) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' };
  }

  // Local fallback: keep an extension from the original name when possible.
  const subdir = localSubdir(folder);
  await mkdir(path.join(UPLOAD_DIR, subdir), { recursive: true });
  const ext = (path.extname(originalName).toLowerCase().match(/^\.[a-z0-9]{1,5}$/) || ['.jpg'])[0];
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, subdir, name), buffer);
  const key = subdir ? `${subdir}/${name}` : name;
  return { url: `/uploads/${key}`, publicId: key, provider: 'local' };
}

/**
 * Where a profile-photo URL points in our storage, or null when it is not a learner's avatar.
 * Only the avatar folder qualifies — a Cloudinary public id under ydu-academy/avatars/ on this
 * account's cloud, or a file under /uploads/avatars/ — so a crafted avatarUrl can never reach a
 * course cover, a banner or someone else's site.
 */
export function avatarTarget(url) {
  if (typeof url !== 'string' || !url) return null;
  let pathname = url;
  let host = '';
  if (/^https?:\/\//i.test(url)) {
    try {
      ({ pathname, hostname: host } = new URL(url));
    } catch {
      return null;
    }
  }

  if (host === 'res.cloudinary.com') {
    // /<cloud>/image/upload/[v<version>/]<public id>.<ext> — the secure_url storeImage returns.
    const match = pathname.match(/^\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
    if (!match) return null;
    const [, cloud, rawId] = match;
    const expectedCloud = configured ? cloudinary.config().cloud_name : null;
    if (expectedCloud && cloud !== expectedCloud) return null;
    let publicId;
    try {
      publicId = decodeURIComponent(rawId);
    } catch {
      return null;
    }
    if (!publicId.startsWith(`${AVATAR_FOLDER}/`) || publicId.includes('..')) return null;
    return { provider: 'cloudinary', publicId };
  }

  const local = pathname.match(/^\/uploads\/avatars\/([\w-]+\.[a-z0-9]{1,5})$/i);
  return local ? { provider: 'local', file: path.join(UPLOAD_DIR, 'avatars', local[1]) } : null;
}

/** Deletes a learner's profile photo from storage. Returns true when a file was removed. */
export async function deleteAvatarImage(url) {
  const target = avatarTarget(url);
  if (!target) return false;
  if (target.provider === 'cloudinary') {
    if (!configured) return false;
    const result = await cloudinary.uploader.destroy(target.publicId, { resource_type: 'image', invalidate: true });
    return result?.result === 'ok';
  }
  try {
    await unlink(target.file);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

export const uploadDir = UPLOAD_DIR;
