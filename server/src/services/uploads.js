/**
 * Image uploads.
 *
 * Preferred: Cloudinary — set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)
 * and every upload lands on the CDN with a responsive delivery URL.
 *
 * Fallback (no Cloudinary configured): files are stored in server/uploads and served
 * from /uploads, so the whole flow still works in plain development.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
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
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return { url: `/uploads/${name}`, publicId: name, provider: 'local' };
}

export const uploadDir = UPLOAD_DIR;
