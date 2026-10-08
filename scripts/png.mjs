/**
 * A tiny PNG codec — just enough for the brand-icon pipeline: decode any 8-bit, non-interlaced PNG
 * to straight RGBA8, and encode RGBA8 back to PNG.
 *
 * Why it exists: every icon in this app is derived from the supplied `assets/images/logo.png`, pixel
 * by pixel (see `generate-brand-icons.mjs`), and `selfcheck.ts` verifies the derived icons against
 * that file. Both need real pixel access. `sharp`/`canvas` are native builds we would have to ship
 * for two functions, and `zlib` — the only hard part of PNG — is already in node. So the file format
 * is handled here, in the open, in about two hundred lines.
 *
 * Supported on decode: bit depth 8, no interlacing, colour types 0 (grey), 2 (RGB), 3 (palette),
 * 4 (grey+alpha) and 6 (RGBA), with all five row filters. Anything else throws loudly — a silently
 * mis-decoded logo would silently ship in every icon.
 * Encode always writes colour type 6 (RGBA), filter 0, which every PNG reader understands.
 */

import { deflateSync, inflateSync } from 'node:zlib';

/* ------------------------------------------------------------------ *
 * CRC-32, for chunk checksums
 * ------------------------------------------------------------------ */

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ------------------------------------------------------------------ *
 * Decode
 * ------------------------------------------------------------------ */

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Decodes a PNG buffer to `{ width, height, data }` with `data` straight (non-premultiplied) RGBA8. */
export function decodePng(buffer) {
  for (let i = 0; i < 8; i += 1) {
    if (buffer[i] !== [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i]) {
      throw new Error('not a PNG file');
    }
  }

  let width = 0;
  let height = 0;
  let colourType = -1;
  let palette = null;
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error(`unsupported PNG bit depth ${body[8]} (only 8)`);
      colourType = body[9];
      if (!(colourType in CHANNELS)) throw new Error(`unsupported PNG colour type ${colourType}`);
      if (body[12] !== 0) throw new Error('interlaced PNG is not supported');
    } else if (type === 'PLTE') {
      palette = body;
    } else if (type === 'IDAT') {
      chunks.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || colourType < 0) throw new Error('PNG is missing its header');

  const raw = inflateSync(Buffer.concat(chunks));
  const channels = CHANNELS[colourType];
  const stride = width * channels;
  const rows = new Uint8Array(height * stride);

  // Un-filter: each scanline carries one filter byte, then the delta-encoded samples.
  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;
    const row = y * stride;
    const prev = row - stride;
    for (let x = 0; x < stride; x += 1) {
      const rawByte = raw[read + x];
      const a = x >= channels ? rows[row + x - channels] : 0;
      const b = y > 0 ? rows[prev + x] : 0;
      const c = x >= channels && y > 0 ? rows[prev + x - channels] : 0;
      let value;
      switch (filter) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + a;
          break;
        case 2:
          value = rawByte + b;
          break;
        case 3:
          value = rawByte + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = rawByte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`unsupported PNG row filter ${filter}`);
      }
      rows[row + x] = value & 0xff;
    }
    read += stride;
  }

  // Normalise every colour type to RGBA8.
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, n = width * height; i < n; i += 1) {
    const s = i * channels;
    let r;
    let g;
    let b;
    let a = 255;
    switch (colourType) {
      case 0:
        r = g = b = rows[s];
        break;
      case 2:
        r = rows[s];
        g = rows[s + 1];
        b = rows[s + 2];
        break;
      case 3: {
        if (!palette) throw new Error('palette PNG without a PLTE chunk');
        const p = rows[s] * 3;
        r = palette[p];
        g = palette[p + 1];
        b = palette[p + 2];
        break;
      }
      case 4:
        r = g = b = rows[s];
        a = rows[s + 1];
        break;
      default:
        r = rows[s];
        g = rows[s + 1];
        b = rows[s + 2];
        a = rows[s + 3];
    }
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return { width, height, data };
}

/* ------------------------------------------------------------------ *
 * Encode
 * ------------------------------------------------------------------ */

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/** Encodes straight RGBA8 pixels as a colour-type-6 PNG. */
export function encodePng({ width, height, data }) {
  if (data.length !== width * height * 4) throw new Error('pixel buffer does not match the size');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter none: the icons are flat art, filters buy nothing here
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
