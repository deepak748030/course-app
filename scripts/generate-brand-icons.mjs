/**
 * Derives the whole app-icon set from the supplied brand artwork, `assets/images/logo.png`.
 *
 *   node scripts/generate-brand-icons.mjs
 *
 * Why derived, not drawn: the logo is a supplied raster, and an icon set re-drawn by hand next to it
 * always drifts — a slightly different churn, a lighter green, a wordmark in a font the artwork does
 * not use. The only way the favicon, the launcher icons and the splash can be *the same logo* is to
 * cut every one of them out of the one file. So this script reads logo.png's pixels and writes:
 *
 *   assets/images/icon.png                    1024, the logo as-is (iOS icon and store listings)
 *   assets/images/favicon.png                  196, the logo as-is (web tab icon)
 *   assets/images/splash-icon.png              512, the logo as-is (splash screen; app.json paints white behind it)
 *   assets/images/brand-logo.png               512, the logo as-is (the in-app lockup raster)
 *   assets/images/android-icon-background.png  432, flat field in the logo's own corner green
 *   assets/images/android-icon-foreground.png  432, the logo with its corner field made transparent
 *   assets/images/android-icon-monochrome.png  432, white silhouette of the logo's artwork, for themed icons
 *   assets/images/brand-mark.png               256, the churn and leaves alone (no wordmark), transparent
 *
 * The Android pair composes back to the logo exactly: the background layer is the logo's corner green
 * and the foreground is everything inside the disc, at the logo's own proportions, so a square, a
 * circle or a squircle mask all show the same artwork the app shows everywhere else. The foreground
 * keeps a soft alpha edge where the disc meets the field, so no mask shape leaves a jaggy rim.
 *
 * Pixel work, in short:
 *   - the corner field is flood-filled from the four corners along the green↔white blend, which finds
 *     the field and the disc's anti-aliased rim without touching the artwork inside the disc;
 *   - rim pixels keep a partial alpha equal to their white share, so the disc edge stays smooth over
 *     any background;
 *   - downsampling is an area (box) filter in premultiplied space — the correct filter for shrinking,
 *     and the reason a 16px favicon gets clean edges instead of resvg's nearest ringing;
 *   - the monochrome layer and the text-free mark come from luminance masks of the same pixels, so
 *     even the silhouettes are the supplied artwork, not a second opinion of it.
 *
 * Only node's own zlib is needed (through ./png.mjs); there is deliberately nothing to install.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng, encodePng } from './png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = resolve(ROOT, 'assets/images');
const LOGO_PATH = resolve(IMAGE_DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * The supplied logo, decoded once
 * ------------------------------------------------------------------ */

const logo = decodePng(readFileSync(LOGO_PATH));
const { width: W, height: H, data: PX } = logo;
if (W !== H) throw new Error(`logo.png must be square, it is ${W}x${H}`);

const pixel = (x, y) => {
  const o = (y * W + x) * 4;
  return [PX[o], PX[o + 1], PX[o + 2], PX[o + 3]];
};

/** The field green, read from the artwork's own corner rather than trusted from a constant. */
const FIELD = pixel(0, 0);
/** The disc white, sampled inside the disc above the churn's lid. */
const PAPER = pixel(W >> 1, Math.round(H * 0.05));

const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------------ *
 * The corner field: flood-filled along the green↔white blend
 * ------------------------------------------------------------------ */

/**
 * How far a colour sits from the field towards the disc white, and how far off that blend line it
 * is. Field pixels and the disc's anti-aliased rim lie on the line (residual ≈ 0); the artwork's
 * saturated greens do not, and the flood stops at them — and could never reach them anyway, because
 * the rim's last pixel (t ≈ 1) is excluded and closes the disc off.
 */
function blend(c) {
  const dx = PAPER[0] - FIELD[0];
  const dy = PAPER[1] - FIELD[1];
  const dz = PAPER[2] - FIELD[2];
  const len = dx * dx + dy * dy + dz * dz;
  const t = clamp01(((c[0] - FIELD[0]) * dx + (c[1] - FIELD[1]) * dy + (c[2] - FIELD[2]) * dz) / len);
  let residual = 0;
  for (let i = 0; i < 3; i += 1) {
    residual = Math.max(residual, Math.abs(c[i] - (FIELD[i] + t * (PAPER[i] - FIELD[i]))));
  }
  return { t, residual };
}

const BLEND_TOLERANCE = 24; // the field is flat, but stay generous with artwork-adjacent noise
const RIM_CEILING = 0.98; // rim pixels whiter than this stay with the disc, closing the flood off

const fieldT = new Float32Array(W * H).fill(-1); // -1 = not field; else the white share of the rim
{
  const stack = [0, W - 1, (H - 1) * W, (H - 1) * W + W - 1];
  while (stack.length) {
    const i = stack.pop();
    if (fieldT[i] >= 0) continue;
    const { t, residual } = blend(pixel(i % W, (i / W) | 0));
    if (residual > BLEND_TOLERANCE || t > RIM_CEILING) continue;
    fieldT[i] = t;
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
}
const fieldPixels = fieldT.filter((t) => t >= 0).length;
if (fieldPixels < W * H * 0.05) {
  throw new Error(`the corner-field flood found only ${fieldPixels} px — logo.png is not the expected artwork`);
}

/* ------------------------------------------------------------------ *
 * Layers cut from the logo
 * ------------------------------------------------------------------ */

/** The logo with its corner field made transparent; the rim keeps a partial alpha so edges stay soft. */
function transparentField() {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const o = i * 4;
    if (fieldT[i] >= 0) {
      const a = Math.round(fieldT[i] * 255);
      data[o] = PAPER[0];
      data[o + 1] = PAPER[1];
      data[o + 2] = PAPER[2];
      data[o + 3] = a;
    } else {
      data[o] = PX[o];
      data[o + 1] = PX[o + 1];
      data[o + 2] = PX[o + 2];
      data[o + 3] = 255;
    }
  }
  return { width: W, height: H, data };
}

/**
 * A white silhouette of everything the artwork draws inside the disc — churn, leaves, YDU, ACADEMY —
 * for Android's themed icons, which tint a single-colour layer. The disc and the field drop out;
 * luminance ramps the mask so the silhouette keeps the artwork's anti-aliased edges.
 */
function monochrome() {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const o = i * 4;
    const a = fieldT[i] >= 0 ? 0 : clamp01((0.94 - luminance([PX[o], PX[o + 1], PX[o + 2]]) ) / 0.1);
    data[o] = 255;
    data[o + 1] = 255;
    data[o + 2] = 255;
    data[o + 3] = Math.round(a * 255);
  }
  return { width: W, height: H, data };
}

/**
 * The mark without the wordmark: the churn and the leaves, on transparent, for small text-free spots.
 * The wordmark is cut off at the first fully blank scanline below the leaves — the gap the artwork
 * already leaves between the leaves and the Y — and the disc white is keyed out by luminance, with
 * each semi-transparent edge pixel un-premultiplied against the white it was blended with.
 */
function markWithoutWordmark() {
  const alpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i += 1) {
    const o = i * 4;
    alpha[i] = fieldT[i] >= 0 ? 0 : clamp01((0.97 - luminance([PX[o], PX[o + 1], PX[o + 2]])) / 0.1);
  }

  let cutY = -1;
  for (let y = Math.round(H * 0.55); y < Math.round(H * 0.8); y += 1) {
    let ink = 0;
    for (let x = 0; x < W; x += 1) ink += alpha[y * W + x] > 0.5 ? 1 : 0;
    if (ink === 0) {
      cutY = y;
      break;
    }
  }
  if (cutY < 0) throw new Error('could not find the blank band between the leaves and the wordmark');

  let x0 = W;
  let y0 = cutY;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < cutY; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (alpha[y * W + x] <= 0.5) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const pad = Math.round(W * 0.015);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(cutY - 1, y1 + pad);

  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y + y0) * W + (x + x0);
      const o = (y * width + x) * 4;
      const a = alpha[i];
      data[o + 3] = Math.round(a * 255);
      if (a > 0.004) {
        // Un-premultiply the edge pixels against the disc white they were drawn on.
        for (let c = 0; c < 3; c += 1) {
          data[o + c] = Math.max(0, Math.min(255, Math.round((PX[i * 4 + c] - (1 - a) * PAPER[c]) / a)));
        }
      }
    }
  }
  return { width, height, data };
}

/* ------------------------------------------------------------------ *
 * Resampling: an area (box) filter, in premultiplied space
 * ------------------------------------------------------------------ */

/** Shrinks an RGBA image to size×size by averaging each destination pixel's source area. Averaging
 *  premultiplied colour is what keeps a semi-transparent edge from bleeding its colour into nothing. */
function downscale(source, size) {
  const { width: sw, height: sh, data: sd } = source;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor((y * sh) / size);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / size));
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor((x * sw) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / size));
      let pr = 0;
      let pg = 0;
      let pb = 0;
      let pa = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const o = (sy * sw + sx) * 4;
          const a = sd[o + 3] / 255;
          pr += sd[o] * a;
          pg += sd[o + 1] * a;
          pb += sd[o + 2] * a;
          pa += a;
        }
      }
      const o = (y * size + x) * 4;
      const alpha = pa / ((x1 - x0) * (y1 - y0));
      data[o + 3] = Math.round(alpha * 255);
      if (pa > 0) {
        data[o] = Math.round(pr / pa);
        data[o + 1] = Math.round(pg / pa);
        data[o + 2] = Math.round(pb / pa);
      }
    }
  }
  return { width: size, height: size, data };
}

/** A flat square in one colour — the Android background layer, which is the logo's own field green. */
function flat(size, [r, g, b]) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return { width: size, height: size, data };
}

/* ------------------------------------------------------------------ *
 * Write the set
 * ------------------------------------------------------------------ */

const opaque = { width: W, height: H, data: PX };
const layers = { field: transparentField(), mono: monochrome(), mark: markWithoutWordmark() };

const targets = [
  ['icon.png', downscale(opaque, 1024)],
  ['favicon.png', downscale(opaque, 196)],
  ['splash-icon.png', downscale(opaque, 512)],
  ['brand-logo.png', downscale(opaque, 512)],
  ['android-icon-background.png', flat(432, FIELD)],
  // The foreground is the disc at the logo's own proportions: the field behind it is the background
  // layer, so every mask shape — circle, squircle, rounded square — composes back to the logo.
  ['android-icon-foreground.png', downscale(layers.field, 432)],
  ['android-icon-monochrome.png', downscale(layers.mono, 432)],
  ['brand-mark.png', downscale(layers.mark, 256)],
];

for (const [name, image] of targets) {
  writeFileSync(resolve(IMAGE_DIR, name), encodePng(image));
}

process.stdout.write(
  `derived ${targets.length} icons from assets/images/logo.png (${W}x${H}, field rgb(${FIELD.slice(0, 3)}))\n  ${targets
    .map(([name, image]) => `${name} ${image.width}x${image.height}`)
    .join('\n  ')}\n`,
);
