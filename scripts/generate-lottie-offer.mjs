/**
 * Generates `assets/lottie/offer.json` — the animated offer mark used by <OfferTag />.
 *
 * The mark is a price tag: a diamond tag with an eyelet punched out of it, inside a ring that pulses,
 * with two twinkles. (It replaced the earlier percent mark: a discount is better said with a tag than
 * with the same `%` the badge already spells out as "OFF".)
 *
 * Why this file exists instead of a downloaded asset: the reference animation the design follows is a
 * LottieFiles offer piece. LottieFiles needs an account and its CDN is not reachable from the build
 * environment, and a Lottie JSON copied from a random mirror carries unclear provenance. So the mark
 * is authored here, in the Lottie (Bodymovin) format, and rendered by the real Lottie runtime
 * (lottie-react-native / lottie-web) — never by CSS.
 *
 * To swap in a different animation, drop it at `assets/lottie/offer.json` and delete nothing else:
 * the component reads that path. Keep this script in sync or delete it with the swap.
 *
 *   node scripts/generate-lottie-offer.mjs
 *
 * Motion (30fps, 90 frames = 3s loop):
 *   tag     always visible, tilted 45 degrees, rocking a few degrees either side of it — so a paused
 *           or reduced-motion frame is still a complete glyph, never an empty square
 *   eyelet  punched out of the tag with a Lottie mask (subtract), so the hole shows whatever is
 *           behind the mark instead of guessing the badge's colour
 *   ring    two slow pulses outward, each fading before the next
 *   sparkles two four-point stars twinkling at opposite phases
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/lottie/offer.json');

const FR = 30;
const DUR = 90;
const SIZE = 512;
const C = SIZE / 2;

/**
 * How much of the square the mark covers.
 *
 * The player fits the whole composition into its box, so every empty pixel around the drawing turns
 * into layout space between the number, the glyph and "OFF" — which is what made the badge read
 * loose. The mark is drawn at this factor (the ring ends up spanning ~96% of the canvas) so the badge
 * can close up, while the ring and the twinkles are kept inside the square.
 */
const FIT = 1.55;
const fit = (value) => Math.round(value * FIT);

/** The tag, in pre-FIT units: a square of half-size 96 with 36-unit corners, and an eyelet of 22. */
const TAG_HALF = 96;
const TAG_RADIUS = 34;
const EYELET_RADIUS = 26;
/**
 * Where the eyelet sits *in the layer's own space*, before the -45 degree tilt.
 *
 * On screen the eyelet is `EYELET_OFFSET` units along the tag's long axis (the horizontal in the
 * artwork); the layer is rotated, so the point that lands there is the offset rotated back by 45
 * degrees: (64, 0) -> (45.25, 45.25).
 */
const EYELET_OFFSET = 68;
const EYELET_LOCAL = EYELET_OFFSET / Math.SQRT2;
/** The tilt the tag is drawn at, and how far the sway rocks it either side. */
const TILT = -45;
const SWAY = 3;

/** Palette: ink for the mark, brand yellow for the twinkles. Values are 0-1, as Lottie expects. */
const INK = [0.1216, 0.1059, 0.0549, 1];
const YELLOW = [1, 0.7765, 0.1608, 1];

/* ------------------------------------------------------------------ *
 * Keyframe helpers
 * ------------------------------------------------------------------ */

/** Standard ease-in-out, matching the app's restrained motion. */
const EASE = { o: { x: [0.42], y: [0] }, i: { x: [0.58], y: [1] } };
const OUT_EASE = { o: { x: [0.16], y: [1] }, i: { x: [0.3], y: [1] } };

/**
 * Builds a keyframe list. `pairs` is [[time, value], ...] and the final entry never carries easing
 * handles — Lottie stops reading them there, and a stray handle is the usual cause of a jump.
 */
function keys(pairs, easing = EASE) {
  return pairs.map(([t, s], index) =>
    index === pairs.length - 1 ? { t, s } : { t, s, ...easing },
  );
}

const still = (value) => ({ a: 0, k: value });
const anim = (pairs, easing) => ({ a: 1, k: keys(pairs, easing) });

/* ------------------------------------------------------------------ *
 * Shape helpers
 * ------------------------------------------------------------------ */

const groupTransform = (extra = {}) => ({
  ty: 'tr',
  p: still([0, 0]),
  a: still([0, 0]),
  s: still([100, 100]),
  r: still(0),
  o: still(100),
  sk: still(0),
  sa: still(0),
  nm: 'Transform',
  ...extra,
});

const fill = (color) => ({ ty: 'fl', c: still(color), o: still(100), r: 1, bm: 0, nm: 'Fill' });

const stroke = (color, width, opacity = 100) => ({
  ty: 'st',
  c: still(color),
  o: still(opacity),
  w: still(width),
  lc: 2,
  lj: 2,
  bm: 0,
  nm: 'Stroke',
});

const ellipse = (size, position) => ({
  ty: 'el',
  d: 1,
  s: still(size),
  p: still(position),
  nm: 'Ellipse',
});

const rect = (size, position, radius) => ({
  ty: 'rc',
  d: 1,
  s: still(size),
  p: still(position),
  r: still(radius),
  nm: 'Rect',
});

/** Magic number for a quarter circle as a cubic bezier. */
const KAPPA = 0.5523;

/**
 * A mask takes a bezier path, not a shape item, so the two masks the tag needs are built here: a
 * rounded square and a circle, both as eight/four vertex paths with the handles rounded off.
 */
function roundedRectPath(half, radius, position = [0, 0]) {
  const straight = half - radius;
  const handle = radius * KAPPA;
  const [px, py] = position;
  const v = [
    [-straight, -half],
    [straight, -half],
    [half, -straight],
    [half, straight],
    [straight, half],
    [-straight, half],
    [-half, straight],
    [-half, -straight],
  ].map(([x, y]) => [x + px, y + py]);
  const i = [
    [-handle, 0],
    [0, 0],
    [0, -handle],
    [0, 0],
    [handle, 0],
    [0, 0],
    [0, handle],
    [0, 0],
  ];
  const o = [
    [0, 0],
    [handle, 0],
    [0, 0],
    [0, handle],
    [0, 0],
    [-handle, 0],
    [0, 0],
    [0, -handle],
  ];
  return { i, o, v, c: true };
}

function circlePath(radius, position = [0, 0]) {
  const handle = radius * KAPPA;
  const [px, py] = position;
  const v = [
    [0, -radius],
    [radius, 0],
    [0, radius],
    [-radius, 0],
  ].map(([x, y]) => [x + px, y + py]);
  const i = [
    [-handle, 0],
    [0, -handle],
    [handle, 0],
    [0, handle],
  ];
  const o = [
    [handle, 0],
    [0, handle],
    [-handle, 0],
    [0, -handle],
  ];
  return { i, o, v, c: true };
}

/** One mask entry. `mode` is 'a' (add to the mask) or 's' (subtract from it). */
const mask = (name, mode, path) => ({
  inv: false,
  mode,
  pt: still(path),
  o: still(100),
  x: still(0),
  nm: name,
});

/** Four-point star: eight vertices alternating outer and inner radius, straight edges. */
function star(outer, innerRatio = 0.3) {
  const v = [];
  const i = [];
  const o = [];
  for (let step = 0; step < 8; step += 1) {
    const angle = ((-90 + step * 45) * Math.PI) / 180;
    const radius = step % 2 === 0 ? outer : outer * innerRatio;
    v.push([Number((Math.cos(angle) * radius).toFixed(2)), Number((Math.sin(angle) * radius).toFixed(2))]);
    i.push([0, 0]);
    o.push([0, 0]);
  }
  return { ty: 'sh', d: 1, ks: still({ i, o, v, c: true }), nm: 'Star' };
}

function shapeLayer({ ind, name, shapes, ks = {}, op = DUR, masksProperties, hasMask = false }) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: still(100),
      r: still(0),
      p: still([C, C, 0]),
      a: still([0, 0, 0]),
      s: still([100, 100, 100]),
      ...ks,
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
    ...(hasMask ? { hasMask: true, masksProperties } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Layers — top first, exactly how Lottie expects them
 * ------------------------------------------------------------------ */

/** Sparkle: pops in, spins a little, fades out. `phase` staggers the stars. */
function sparkleLayer({ ind, position, size, phase }) {
  const pulse = (start) => {
    const peak = start + 10;
    const end = start + 30;
    return { peak, end, start };
  };
  const first = pulse(phase);
  const second = phase + 45 <= DUR - 30 ? pulse(phase + 45) : null;

  const scaleKeys = [];
  const rotateKeys = [];
  const opacityKeys = [];

  const pulses = [first, second].filter(Boolean);
  pulses.forEach(({ start, peak, end }, index) => {
    scaleKeys.push([start, [0, 0, 100]], [peak, [118, 118, 100]], [end, [0, 0, 100]]);
    rotateKeys.push([start, [index * 30]], [end, [index * 30 + 40]]);
    opacityKeys.push([start, [0]], [peak, [100]], [end, [0]]);
  });

  return shapeLayer({
    ind,
    name: `Sparkle ${ind}`,
    ks: {
      p: still([position[0], position[1], 0]),
      s: anim(scaleKeys, OUT_EASE),
      r: anim(rotateKeys, OUT_EASE),
      o: anim(opacityKeys, OUT_EASE),
    },
    shapes: [{ ty: 'gr', it: [star(size), fill(YELLOW), groupTransform()], nm: 'Star', np: 3 }],
  });
}

const layers = [
  // Twinkles sit just off the tag's two opposite corners: inside the canvas, outside the ink.
  sparkleLayer({ ind: 1, position: [C - 158, C - 166], size: 62, phase: 0 }),
  sparkleLayer({ ind: 2, position: [C + 162, C + 142], size: 50, phase: 15 }),

  // The tag: always on screen, tilted, rocking gently. The eyelet is a subtract mask, so what shows
  // through the hole is whatever sits behind the mark.
  shapeLayer({
    ind: 3,
    name: 'Tag',
    hasMask: true,
    masksProperties: [
      mask('Tag', 'a', roundedRectPath(fit(TAG_HALF), fit(TAG_RADIUS))),
      mask('Eyelet', 's', circlePath(fit(EYELET_RADIUS), [fit(EYELET_LOCAL), fit(EYELET_LOCAL)])),
    ],
    ks: {
      // The tilt is on the layer, so the masks tilt with the shape.
      r: anim([
        [0, [TILT - SWAY]],
        [22, [TILT + SWAY]],
        [45, [TILT - SWAY]],
        [67, [TILT + SWAY]],
        [90, [TILT - SWAY]],
      ]),
      s: anim([[0, [98, 98, 100]], [45, [102, 102, 100]], [90, [98, 98, 100]]]),
    },
    shapes: [
      {
        ty: 'gr',
        nm: 'TagBody',
        np: 3,
        it: [rect([fit(TAG_HALF * 2), fit(TAG_HALF * 2)], [0, 0], fit(TAG_RADIUS)), fill(INK), groupTransform()],
      },
    ],
  }),

  // Ring: one slow pulse per loop. It snaps back to its start size on the next frame, while it is
  // still invisible, so the cycle repeats without a visible jump and every keyframe value lines up.
  // The pulse grows from 80% to 100%, which is what keeps the widened ring (and its stroke) inside
  // the canvas — anything larger would be clipped into a straight edge at peak.
  shapeLayer({
    ind: 4,
    name: 'Ring',
    ks: {
      s: anim(
        [
          [0, [80, 80, 100]],
          [45, [100, 100, 100]],
          [46, [80, 80, 100]],
          [90, [80, 80, 100]],
        ],
        OUT_EASE,
      ),
      o: anim([[0, [0]], [6, [30]], [45, [0]], [90, [0]]], OUT_EASE),
    },
    shapes: [
      {
        ty: 'gr',
        nm: 'Ring',
        np: 3,
        it: [ellipse([fit(304), fit(304)], [0, 0]), stroke(INK, fit(15), 90), groupTransform()],
      },
    ],
  }),
];

const animation = {
  v: '5.9.0',
  fr: FR,
  ip: 0,
  op: DUR,
  w: SIZE,
  h: SIZE,
  nm: 'YDU offer mark',
  ddd: 0,
  assets: [],
  layers,
  markers: [],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(animation, null, 1)}\n`);

const shapeCount = layers.reduce((total, layer) => total + layer.shapes.length, 0);
process.stdout.write(`wrote ${OUT} — ${layers.length} layers, ${shapeCount} shapes, ${DUR} frames\n`);
