/**
 * Generates `assets/lottie/offer.json` — the animated offer mark used by <OfferTag />.
 *
 * Why this file exists instead of a downloaded asset: the reference animation the design follows
 * is the LottieFiles "offer percentage" piece (JOEL J GEORGE). LottieFiles needs an account and its
 * CDN is not reachable from the build environment, and a Lottie JSON copied from a random mirror
 * carries unclear provenance. So the mark is authored here, in the Lottie (Bodymovin) format, and
 * rendered by the real Lottie runtime (lottie-react-native / dotLottie) — never by CSS.
 *
 * To swap in a different animation, drop it at `assets/lottie/offer.json` and delete nothing else:
 * the component reads that path. Keep this script in sync or delete it with the swap.
 *
 *   node scripts/generate-lottie-offer.mjs
 *
 * Motion (30fps, 90 frames = 3s loop):
 *   percent mark  always visible, breathes through a 4 degree sway — so a paused or reduced-motion
 *                 frame is still a complete glyph, never an empty square
 *   ring          two slow pulses outward, each fading before the next
 *   sparkles      two four-point stars twinkling at opposite phases
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/lottie/offer.json');

const FR = 30;
const DUR = 90;
const SIZE = 512;
const C = SIZE / 2;

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

function shapeLayer({ ind, name, shapes, ks = {}, op = DUR }) {
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
    // Rotation accumulates a half turn per pulse, so the seam lands on a full turn: 0 -> 180 -> 360
    // is 0 -> 180 -> 0 as far as the eye is concerned, and the loop still joins cleanly.
    rotateKeys.push([start, [index * 180]], [end, [(index + 1) * 180]]);
    opacityKeys.push([start, [0]], [start + 6, [100]], [end - 6, [100]], [end, [0]]);
  });

  // The layer has to start and end on the same value or the loop jumps.
  if (scaleKeys[0][0] !== 0) scaleKeys.unshift([0, [0, 0, 100]]);
  if (rotateKeys[0][0] !== 0) rotateKeys.unshift([0, [0]]);
  if (opacityKeys[0][0] !== 0) opacityKeys.unshift([0, [0]]);

  const lastT = DUR;
  for (const list of [scaleKeys, rotateKeys, opacityKeys]) {
    if (list[list.length - 1][0] !== lastT) list.push([lastT, list[list.length - 1][1]]);
  }

  return shapeLayer({
    ind,
    name: 'Sparkle',
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
  sparkleLayer({ ind: 1, position: [C - 132, C - 150], size: 54, phase: 0 }),
  sparkleLayer({ ind: 2, position: [C + 140, C + 116], size: 44, phase: 15 }),

  // Percent mark: always on screen, swaying gently.
  shapeLayer({
    ind: 3,
    name: 'Percent',
    ks: {
      r: anim([[0, [-3]], [22, [3]], [45, [-3]], [67, [3]], [90, [-3]]]),
      s: anim([[0, [98, 98, 100]], [45, [102, 102, 100]], [90, [98, 98, 100]]]),
    },
    shapes: [
      {
        ty: 'gr',
        nm: 'Slash',
        np: 3,
        it: [rect([212, 34], [0, 0], 17), fill(INK), groupTransform({ r: still(-45) })],
      },
      { ty: 'gr', nm: 'DotTopLeft', np: 3, it: [ellipse([68, 68], [-88, -88]), fill(INK), groupTransform()] },
      { ty: 'gr', nm: 'DotBottomRight', np: 3, it: [ellipse([68, 68], [88, 88]), fill(INK), groupTransform()] },
    ],
  }),

  // Ring: one slow pulse per loop. It snaps back to its start size on the next frame, while it is
  // still invisible, so the cycle repeats without a visible jump and every keyframe value lines up.
  shapeLayer({
    ind: 4,
    name: 'Ring',
    ks: {
      s: anim(
        [
          [0, [88, 88, 100]],
          [45, [120, 120, 100]],
          [46, [88, 88, 100]],
          [90, [88, 88, 100]],
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
        it: [ellipse([300, 300], [0, 0]), stroke(INK, 20, 100), groupTransform()],
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
