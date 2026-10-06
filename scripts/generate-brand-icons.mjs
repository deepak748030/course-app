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
 * The green is the one from the brand artwork (#0B5C1E), the leaf gradient runs to #5CC15E.
 *
 * Type is set in DM Sans — the app's own family — loaded from the installed font package, and the
 * script fails loudly if that font cannot be read, because a logo with the wordmark silently missing
 * is worse than no logo at all.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = resolve(ROOT, 'assets/brand');
const IMAGE_DIR = resolve(ROOT, 'assets/images');

/* ------------------------------------------------------------------ *
 * Palette and geometry
 * ------------------------------------------------------------------ */

const GREEN = '#0B5C1E';
const GREEN_DEEP = '#08430F';
const LEAF_LIGHT = '#5CC15E';

/** One square unit for every drawing: the lockup, the mark and the icons all start from 1000. */
const BOX = 1000;

/**
 * The lockup is drawn in one square of 1000 units, top to bottom: lid, can, name, suffix.
 *
 * The numbers are not arbitrary — the disc is a circle, so every element has to stay inside it. The
 * wordmark is the tight one: at the bottom of the disc the circle is at its narrowest, so the name is
 * sized and placed to leave the same air on both sides at that height (see the comment on `DISC`).
 */

/** The disc the lockup sits on. Its 470 radius leaves a 30-unit green margin in the square field. */
const DISC = 470;

/**
 * Milk can: a wide lid, a neck, a tapering body, and two thin handles that arc out from under the lid
 * and clear of the body. The handles are drawn after the body on purpose — the reference artwork has
 * them sitting over the shoulder, which is what makes the silhouette read as a milk can rather than a
 * jar.
 */
const CAN = `
    <path d="M 352 212 C 302 226 290 288 290 352 C 290 414 314 456 366 466"
          fill="none" stroke="url(#can)" stroke-width="24" stroke-linecap="round" />
    <path d="M 648 212 C 698 226 710 288 710 352 C 710 414 686 456 634 466"
          fill="none" stroke="url(#can)" stroke-width="24" stroke-linecap="round" />
    <rect x="318" y="168" width="364" height="58" rx="20" fill="url(#can)" />
    <rect x="350" y="226" width="300" height="48" fill="url(#can)" opacity="0.94" />
    <path d="M 356 274 L 644 274 L 660 322 L 634 552 Q 632 562 620 562 L 380 562 Q 368 562 366 552 L 340 322 Z"
          fill="url(#can)" />
    <rect x="352" y="332" width="296" height="7" fill="#FFFFFF" opacity="0.26" />
    <ellipse cx="420" cy="410" rx="19" ry="84" fill="#FFFFFF" opacity="0.15" />`;

/** Two leaves behind the can: lens-shaped, tips up and out, each with a vein. */
/** Two leaves behind the can: lens-shaped, tips up and out, each with a vein. */
const LEAVES = `
    <path d="M 402 560 Q 198 476 164 226 Q 328 344 402 560 Z" fill="url(#leaf)" />
    <path d="M 598 560 Q 802 476 836 226 Q 672 344 598 560 Z" fill="url(#leaf)" />
    <path d="M 386 534 Q 246 424 196 262" fill="none" stroke="#EDF9EA" stroke-width="6"
          stroke-linecap="round" opacity="0.45" />
    <path d="M 614 534 Q 754 424 804 262" fill="none" stroke="#EDF9EA" stroke-width="6"
          stroke-linecap="round" opacity="0.45" />`;

/** The wordmark, in the app's own family. The suffix is what the bottom of the disc has room for. */
const WORDMARK = `
    <text x="500" y="752" text-anchor="middle" font-family="DM Sans" font-size="222" font-weight="800"
          letter-spacing="-6" fill="${GREEN}">YDU</text>
    <text x="500" y="856" text-anchor="middle" font-family="DM Sans" font-size="84" font-weight="700"
          letter-spacing="10" fill="${GREEN}">ACADEMY</text>`;

const GRADIENTS = `
    <linearGradient id="can" x1="0" y1="120" x2="0" y2="620" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2E8B3A" />
      <stop offset="0.45" stop-color="#12702A" />
      <stop offset="1" stop-color="${GREEN_DEEP}" />
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="580" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1B7A2B" />
      <stop offset="1" stop-color="${LEAF_LIGHT}" />
    </linearGradient>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}">
  <defs>${GRADIENTS}</defs>${body}
</svg>
`;

/** The full lockup: disc, leaves, can, name. */
const LOGO_SVG = svg(`
  <circle cx="500" cy="500" r="${DISC}" fill="#FFFFFF" />${LEAVES}${CAN}${WORDMARK}`);

/** The mark on its own: the same can and leaves, no disc and no name — for small, text-free spots. */
const markSvg = (color) =>
  svg(`
  <g>${LEAVES}${CAN}</g>`).replace(/url\(#can\)/g, color).replace(/url\(#leaf\)/g, color);

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
  ['assets/images/android-icon-monochrome.png', render(place(432, 0.56, null, markSvg('#FFFFFF')), 432)],
  ['assets/images/favicon.png', render(place(196, 0.86, GREEN), 196)],
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

// `readFileSync` is imported for the font check above; keep the reference explicit for linters.
void readFileSync;
