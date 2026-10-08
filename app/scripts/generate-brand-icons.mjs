/**
 * Generates the YDU Academy logo and the whole app-icon set from one piece of geometry.
 *
 * Why a generator: the logo has to be *identical* on the splash screen, in the header, in the web
 * favicon, on iOS and on Android — where the launcher crops the artwork into a circle, a squircle or
 * a rounded square depending on the device. Drawing it once here and rendering every size from the
 * same source is the only way that stays true.
 *
 *   node scripts/generate-brand-icons.mjs
 *
 * What it writes:
 *   assets/brand/ydu-logo.svg              the lockup: white disc, milk can with two leaves, wordmark
 *   assets/brand/ydu-mark.svg              the can and leaves alone, without the disc or the name
 *   assets/images/icon.png                 1024, green field + logo (iOS and store listings)
 *   assets/images/android-icon-foreground.png  432, logo inside Android's 66% safe zone
 *   assets/images/android-icon-background.png  432, the flat green the icon sits on
 *   assets/images/android-icon-monochrome.png  432, white silhouette for themed icons
 *   assets/images/favicon.png              196, green field + logo
 *   assets/images/splash-icon.png          512, logo on transparent (the splash screen is white)
 *   assets/images/brand-logo.png           512, the lockup for use inside the app
 *   assets/images/brand-mark.png           256, the mark for small, text-free spots
 *
 * Colours are fixed, not themed: a logo that changed with the app's theme would no longer be a logo.
 *
 * The drawing follows the brand artwork: a white disc filling the square, a tall milk churn with a
 * wide lid, a white ring where the shoulder meets the body and two white-outlined handles, two big
 * leaves with a white vein sweeping down and out from behind the can, and the name in a heavy
 * geometric face. The letters YDU are drawn as paths rather than set in type — the reference weight is
 * heavier than any font we ship, and paths mean the icon never depends on a font being installed.
 * Only ACADEMY is set in DM Sans (the app's own family), loaded from the installed font package; the
 * script fails loudly if that font cannot be read, because a logo with the wordmark silently missing
 * is worse than no logo at all.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = resolve(ROOT, 'assets/brand');
const IMAGE_DIR = resolve(ROOT, 'assets/images');

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

/** The brand's field green — the same value the app uses in marks.tsx and app.json. */
const GREEN = '#0B5C1E';
const GREEN_DEEP = '#08430F';
const GREEN_LIGHT = '#2E8B3A';
/** The leaves run from a sunlit tip to a deep base, as in the artwork. */
const LEAF_TIP = '#A7E97C';
const LEAF_MID = '#4FB94A';
const LEAF_BASE = '#26822F';
/** The name is cut in a near-black green with a lighter top edge. */
const INK_TOP = '#3A8C3D';
const INK_BOTTOM = '#123F19';
const INK_BEVEL = '#4CA64C';
/** The ring, the handles' outline and the veins: the artwork's white detailing. */
const WHITE = '#FFFFFF';

/** One square unit for every drawing: the lockup, the mark and the icons all start from 1000. */
const BOX = 1000;

/* ------------------------------------------------------------------ *
 * Geometry — one drawing, reused by every output
 * ------------------------------------------------------------------ */

const DISC = { cx: 500, cy: 500, r: 500 };

/**
 * Two leaves behind the can: slender blades whose bases hide behind the body and whose tips point
 * down and out, as in the artwork. Each is a lens — one edge bulging up, the other down.
 */
const LEAF_PATHS = [
  'M 438 330 Q 232 366 106 646 Q 318 622 438 330 Z',
  'M 562 330 Q 768 366 894 646 Q 682 622 562 330 Z',
];
/** One white vein per leaf, following the blade from just short of the tip back to the can. */
const LEAF_VEINS = ['M 196 584 Q 306 470 408 372', 'M 804 584 Q 694 470 592 372'];
const LEAF_GRADIENTS = [
  { id: 'leafL', x1: 106, y1: 646, x2: 438, y2: 330 },
  { id: 'leafR', x1: 894, y1: 646, x2: 562, y2: 330 },
];

/**
 * The two handles: a squared bracket with rounded corners, drawn with a white outline and a green
 * core — the detail that makes the silhouette read as a milk churn and not a jar. Both ends run past
 * the can's edge and are hidden behind it.
 */
const HANDLE_PATHS = [
  'M 440 252 L 380 252 Q 332 252 332 300 L 332 382 Q 332 430 380 430 L 428 430',
  'M 560 252 L 620 252 Q 668 252 668 300 L 668 382 Q 668 430 620 430 L 572 430',
];

/** The body: a curved shoulder off the neck, a tall near-cylinder, rounded base. */
const BODY_PATH =
  'M 424 244 C 392 274 372 312 366 352 L 358 558 Q 358 596 396 596 L 604 596 Q 642 596 642 558 L 634 352 C 628 312 608 274 576 244 Z';
/** The lid, the white gap under it, the neck, and the ring where the shoulder meets the body. */
const CAP = { x: 398, y: 112, width: 204, height: 64, rx: 24 };
const CAP_GAP = { x: 432, y: 178, width: 136, height: 10 };
const NECK_PATH = 'M 430 188 L 570 188 L 578 246 L 422 246 Z';
const RING = { cx: 500, cy: 352, rx: 136, ry: 16 };

/**
 * YDU, drawn as paths: three letters of 212 units with a 16-unit gap, on a 210-unit cap height. The
 * Y's arms have vertical outer edges that turn into the diagonal, the D's bowl is squared off, and
 * the U's inner floor is a shallow curve — the reference letterforms, heavier than any font we ship.
 */
const NAME_TOP = 620;
const NAME_BOXES = [
  ['Y', 166],
  ['D', 394],
  ['U', 620],
];
const LETTER_PATHS = {
  Y: 'M 0 0 L 74 0 L 150 104 L 62 104 Z M 138 0 L 212 0 L 150 104 L 62 104 Z M 62 104 L 150 104 L 150 210 L 62 210 Z',
  D: 'M 0 0 L 116 0 Q 210 0 210 105 Q 210 210 116 210 L 0 210 Z M 70 56 L 70 154 L 116 154 Q 156 154 156 105 Q 156 56 116 56 Z',
  U: 'M 0 0 L 0 118 Q 0 210 105 210 Q 210 210 210 118 L 210 0 L 142 0 L 142 100 Q 142 150 105 150 Q 68 150 68 100 L 68 0 Z',
};
/** The name is lifted 9 units in a lighter green first, which leaves a bevel along its top edges. */
const NAME_BEVEL = 9;

/** ACADEMY, tracked wide under the name. */
const SUFFIX = { size: 90, letterSpacing: 11, baseline: 912 };

const GRADIENTS = `
    <linearGradient id="canLid" x1="0" y1="112" x2="0" y2="322" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${GREEN_LIGHT}" />
      <stop offset="0.5" stop-color="#1B7A2B" />
      <stop offset="1" stop-color="#14672A" />
    </linearGradient>
    <linearGradient id="canBody" x1="356" y1="0" x2="646" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#17702A" />
      <stop offset="0.18" stop-color="#3B9E45" />
      <stop offset="0.45" stop-color="#26822F" />
      <stop offset="0.78" stop-color="#14672A" />
      <stop offset="1" stop-color="${GREEN_DEEP}" />
    </linearGradient>
${LEAF_GRADIENTS.map(
  (g) => `    <linearGradient id="${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${LEAF_TIP}" />
      <stop offset="0.55" stop-color="${LEAF_MID}" />
      <stop offset="1" stop-color="${LEAF_BASE}" />
    </linearGradient>`,
).join('\n')}
    <linearGradient id="ink" x1="0" y1="${NAME_TOP}" x2="0" y2="${NAME_TOP + 210}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${INK_TOP}" />
      <stop offset="1" stop-color="${INK_BOTTOM}" />
    </linearGradient>`;

/** The letters, positioned and filled with whatever paints them. */
const name = (paint) =>
  NAME_BOXES.map(
    ([letter, x]) =>
      `    <path d="${LETTER_PATHS[letter]}"${paint ? ` fill="${paint}"` : ''} fill-rule="nonzero" transform="translate(${x} ${NAME_TOP})" />`,
  ).join('\n');

/** Leaves, then the handles over them, then the can — the reference artwork's stacking order. */
const leaves = (fill) =>
  LEAF_PATHS.map((d, index) => `    <path d="${d}" fill="${fill ?? `url(#${LEAF_GRADIENTS[index].id})`}" />`).join(
    '\n',
  );

const MARK_LAYERS = (fill) => `
${leaves(fill)}
${HANDLE_PATHS.map(
  (d) =>
    `    <path d="${d}" fill="none" stroke="${fill}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />`,
).join('\n')}
    <path d="${BODY_PATH}" fill="${fill}" />
    <path d="${NECK_PATH}" fill="${fill}" />
    <rect x="${CAP.x}" y="${CAP.y}" width="${CAP.width}" height="${CAP.height}" rx="${CAP.rx}" fill="${fill}" />`;

/** The mark on its own: the same can and leaves, no disc and no name — for small, text-free spots. */
const markSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}">${MARK_LAYERS(
    color,
  )}\n</svg>\n`;

/** The full lockup: disc, leaves, can, name. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}">
  <defs>${GRADIENTS}
  </defs>
  <circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${WHITE}" />
${leaves()}
  <g>
${HANDLE_PATHS.map(
  (d) =>
    `    <path d="${d}" fill="none" stroke="${WHITE}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />`,
).join('\n')}
${HANDLE_PATHS.map(
  (d) =>
    `    <path d="${d}" fill="none" stroke="url(#canLid)" stroke-width="27" stroke-linecap="round" stroke-linejoin="round" />`,
).join('\n')}
  </g>
${LEAF_VEINS.map(
  (d) =>
    `  <path d="${d}" fill="none" stroke="${WHITE}" stroke-width="14" stroke-linecap="round" opacity="0.9" />`,
).join('\n')}
  <path d="${BODY_PATH}" fill="url(#canBody)" />
  <ellipse cx="${RING.cx}" cy="${RING.cy}" rx="${RING.rx}" ry="${RING.ry}" fill="none" stroke="${WHITE}" stroke-width="11" />
  <rect x="384" y="352" width="26" height="188" rx="13" fill="${WHITE}" opacity="0.18" />
  <rect x="400" y="336" width="12" height="150" rx="6" fill="${WHITE}" opacity="0.3" />
  <path d="${NECK_PATH}" fill="url(#canLid)" />
  <rect x="${CAP_GAP.x}" y="${CAP_GAP.y}" width="${CAP_GAP.width}" height="${CAP_GAP.height}" fill="${WHITE}" />
  <rect x="${CAP.x}" y="${CAP.y}" width="${CAP.width}" height="${CAP.height}" rx="${CAP.rx}" fill="url(#canLid)" />
  <g fill="${INK_BEVEL}" transform="translate(0 -${NAME_BEVEL})">
${name(null)}
  </g>
${name('url(#ink)')}
  <text x="500" y="${SUFFIX.baseline}" text-anchor="middle" font-family="DM Sans" font-size="${SUFFIX.size}"
        font-weight="700" letter-spacing="${SUFFIX.letterSpacing}" fill="${INK_BOTTOM}">ACADEMY</text>
</svg>
`;

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const FONT_FILES = [
  resolve(ROOT, 'node_modules/@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf'),
  resolve(ROOT, 'node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
];

for (const file of FONT_FILES) {
  if (!existsSync(file)) {
    throw new Error(
      `missing font ${file} — run \`npm install\` (@expo-google-fonts/dm-sans ships the wordmark's type)`,
    );
  }
}

/** Rasterises one SVG string at the exact pixel size the platform expects. */
function render(source, size, background) {
  const resvg = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
    background: background ?? 'rgba(0,0,0,0)',
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'DM Sans' },
  });
  return resvg.render().asPng();
}

/**
 * Places one piece of artwork on a square canvas: `share` is how much of the canvas it covers, `field`
 * the colour behind it (null leaves the canvas transparent). This is what holds the artwork inside
 * Android's 66% safe zone and inside the iOS icon's rounded mask.
 */
function place(size, share, field, art = LOGO_SVG) {
  const inner = art.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const artSize = Math.round(size * share);
  const offset = (size - artSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${field ? `<rect width="${size}" height="${size}" fill="${field}" />` : ''}
  <g transform="translate(${offset} ${offset}) scale(${artSize / BOX})">${inner}</g>
</svg>
`;
}

const targets = [
  // App icon: the green field runs to every edge, so a square, a circle or a squircle crop all read.
  ['assets/images/icon.png', render(place(1024, 0.88, GREEN), 1024)],
  // Android draws its own background, so the foreground carries only the lockup — held inside the
  // 66% safe zone so no mask, from the tightest circle to the widest rounded square, can clip it.
  ['assets/images/android-icon-foreground.png', render(place(432, 0.62, null), 432)],
  [
    'assets/images/android-icon-background.png',
    render(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432"><rect width="432" height="432" fill="${GREEN}" /></svg>`,
      432,
    ),
  ],
  // Themed icons are tinted by the system, so this one is a flat silhouette of the mark: the wordmark
  // would be about five pixels tall inside a launcher and would read as dirt, not as a name.
  ['assets/images/android-icon-monochrome.png', render(place(432, 0.56, null, markSvg(WHITE)), 432)],
  ['assets/images/favicon.png', render(place(196, 0.92, GREEN), 196)],
  // The splash screen paints its own white background, so this stays transparent.
  ['assets/images/splash-icon.png', render(LOGO_SVG, 512)],
  ['assets/images/brand-logo.png', render(LOGO_SVG, 512)],
  ['assets/images/brand-mark.png', render(markSvg(GREEN), 256)],
];

/* ------------------------------------------------------------------ *
 * SVG sources, then the pixels
 * ------------------------------------------------------------------ */

mkdirSync(BRAND_DIR, { recursive: true });
mkdirSync(IMAGE_DIR, { recursive: true });

writeFileSync(resolve(BRAND_DIR, 'ydu-logo.svg'), LOGO_SVG);
writeFileSync(resolve(BRAND_DIR, 'ydu-mark.svg'), markSvg(GREEN));

for (const [relative, png] of targets) {
  writeFileSync(resolve(ROOT, relative), png);
}

process.stdout.write(
  `wrote the logo, the mark and ${targets.length} icon files\n  ${targets
    .map(([relative]) => relative.replace('assets/images/', ''))
    .join('\n  ')}\n`,
);
