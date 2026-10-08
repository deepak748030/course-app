/**
 * Brand marks: the YDU Academy logo, drawn as vector geometry so it stays crisp at every size.
 *
 * The artwork is a tall milk churn — wide lid, white gap, conical shoulder, a white ring where the
 * shoulder meets the body, two white-outlined handles — over two leaves with a white vein each, above
 * the name YDU and its wide-tracked ACADEMY. YDU is drawn as paths (the reference weight is heavier
 * than any font we ship and paths never depend on a font being installed); ACADEMY is set in the app's
 * own family.
 *
 * This is the same drawing that `scripts/generate-brand-icons.mjs` rasterises into the launcher icon,
 * the splash icon and the favicon, and `scripts/selfcheck.ts` compares the two files so they cannot
 * drift apart: change the geometry here, run the generator, and every icon follows.
 *
 *   - `BrandMark`   — the churn and the leaves alone, for headers, tiles and footers. It carries the
 *                     brand's greens; pass `color` to flatten it to one colour when it sits on
 *                     something that is already brand-coloured (the poster's lock-up, a yellow tile).
 *   - `BrandLockup` — the full logo (disc, mark, name), shown from the same PNG the icons are made
 *                     from, so the app never draws a second version of the brand.
 *   - `Wordmark`    — the mark next to the name in running text, for places that need a small label.
 */

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { createStyles, colors, font, spacing } from '@/constants/theme';
import { images } from '@/media';

/** The brand's own green — fixed, not themed: a logo that changed with the app's theme is not a logo. */
export const BRAND_GREEN = '#0B5C1E';
const BRAND_GREEN_DEEP = '#08430F';
const BRAND_GREEN_LIGHT = '#2E8B3A';
const BRAND_LEAF_TIP = '#A7E97C';
const BRAND_LEAF_MID = '#4FB94A';
const BRAND_LEAF_BASE = '#26822F';
const BRAND_WHITE = '#FFFFFF';

/** The square everything is drawn in, matching the generator. */
const BOX = 1000;

/**
 * Two leaves behind the churn: slender blades whose bases hide behind the body and whose tips point
 * down and out. Kept in step with scripts/generate-brand-icons.mjs (asserted by scripts/selfcheck.ts).
 */
const LEAF_PATHS = [
  'M 438 330 Q 232 366 106 646 Q 318 622 438 330 Z',
  'M 562 330 Q 768 366 894 646 Q 682 622 562 330 Z',
];
const LEAF_VEINS = ['M 196 584 Q 306 470 408 372', 'M 804 584 Q 694 470 592 372'];

/** The two handles, drawn with a white outline over the leaves — the detail that reads as a churn. */
const HANDLE_PATHS = [
  'M 440 252 L 380 252 Q 332 252 332 300 L 332 382 Q 332 430 380 430 L 428 430',
  'M 560 252 L 620 252 Q 668 252 668 300 L 668 382 Q 668 430 620 430 L 572 430',
];

/** The can: lid, white gap, neck, conical shoulder, body, and the white ring at the shoulder. */
const BODY_PATH =
  'M 424 244 C 392 274 372 312 366 352 L 358 558 Q 358 596 396 596 L 604 596 Q 642 596 642 558 L 634 352 C 628 312 608 274 576 244 Z';
const NECK_PATH = 'M 430 188 L 570 188 L 578 246 L 422 246 Z';
const CAP = { x: 398, y: 112, width: 204, height: 64, rx: 24 };
const CAP_GAP = { x: 432, y: 178, width: 136, height: 10 };
const RING = { cx: 500, cy: 352, rx: 136, ry: 16 };

export function BrandMark({ size = 40, color }: { size?: number; color?: string }) {
  // A flat mark: one colour, for artwork that is already wearing the brand.
  if (color) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${BOX} ${BOX}`}
        accessibilityRole="image"
        accessibilityLabel="YDU Academy">
        {LEAF_PATHS.map((d) => (
          <Path key={d} d={d} fill={color} />
        ))}
        {HANDLE_PATHS.map((d) => (
          <Path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={44}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <Path d={BODY_PATH} fill={color} />
        <Path d={NECK_PATH} fill={color} />
        <Rect x={CAP.x} y={CAP.y} width={CAP.width} height={CAP.height} rx={CAP.rx} fill={color} />
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${BOX} ${BOX}`}
      accessibilityRole="image"
      accessibilityLabel="YDU Academy">
      <Defs>
        <LinearGradient id="brandLid" x1="0" y1="112" x2="0" y2="322" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={BRAND_GREEN_LIGHT} />
          <Stop offset="0.5" stopColor="#1B7A2B" />
          <Stop offset="1" stopColor="#14672A" />
        </LinearGradient>
        <LinearGradient id="brandCan" x1="356" y1="0" x2="646" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#17702A" />
          <Stop offset="0.18" stopColor="#3B9E45" />
          <Stop offset="0.45" stopColor="#26822F" />
          <Stop offset="0.78" stopColor="#14672A" />
          <Stop offset="1" stopColor={BRAND_GREEN_DEEP} />
        </LinearGradient>
        <LinearGradient id="brandLeafL" x1="106" y1="646" x2="438" y2="330" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={BRAND_LEAF_TIP} />
          <Stop offset="0.55" stopColor={BRAND_LEAF_MID} />
          <Stop offset="1" stopColor={BRAND_LEAF_BASE} />
        </LinearGradient>
        <LinearGradient id="brandLeafR" x1="894" y1="646" x2="562" y2="330" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={BRAND_LEAF_TIP} />
          <Stop offset="0.55" stopColor={BRAND_LEAF_MID} />
          <Stop offset="1" stopColor={BRAND_LEAF_BASE} />
        </LinearGradient>
      </Defs>

      <Path d={LEAF_PATHS[0]} fill="url(#brandLeafL)" />
      <Path d={LEAF_PATHS[1]} fill="url(#brandLeafR)" />

      <G>
        <Path d={HANDLE_PATHS[0]} fill="none" stroke={BRAND_WHITE} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={HANDLE_PATHS[1]} fill="none" stroke={BRAND_WHITE} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={HANDLE_PATHS[0]} fill="none" stroke="url(#brandLid)" strokeWidth={27} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={HANDLE_PATHS[1]} fill="none" stroke="url(#brandLid)" strokeWidth={27} strokeLinecap="round" strokeLinejoin="round" />
      </G>

      {LEAF_VEINS.map((d) => (
        <Path key={d} d={d} fill="none" stroke={BRAND_WHITE} strokeWidth={14} strokeLinecap="round" opacity={0.9} />
      ))}

      <Path d={BODY_PATH} fill="url(#brandCan)" />
      <Ellipse cx={RING.cx} cy={RING.cy} rx={RING.rx} ry={RING.ry} fill="none" stroke={BRAND_WHITE} strokeWidth={11} />
      <Rect x={384} y={352} width={26} height={188} rx={13} fill={BRAND_WHITE} opacity={0.18} />
      <Rect x={400} y={336} width={12} height={150} rx={6} fill={BRAND_WHITE} opacity={0.3} />
      <Path d={NECK_PATH} fill="url(#brandLid)" />
      <Rect x={CAP_GAP.x} y={CAP_GAP.y} width={CAP_GAP.width} height={CAP_GAP.height} fill={BRAND_WHITE} />
      <Rect x={CAP.x} y={CAP.y} width={CAP.width} height={CAP.height} rx={CAP.rx} fill="url(#brandLid)" />
    </Svg>
  );
}

/**
 * The full logo — disc, mark and name — shown from the PNG the launcher icon and the favicon are
 * rendered from. Using the file rather than redrawing it here is what keeps the app, the splash screen
 * and the icon on the home screen exactly the same picture.
 */
export function BrandLockup({ width = 200 }: { width?: number }) {
  return (
    <Image
      source={images.brandLogo}
      style={{ width, height: width }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="YDU Academy"
    />
  );
}

/** Wordmark: the mark next to the name in running text, for places that need a small label. */
export function Wordmark({ size = 22, color = colors.text }: { size?: number; color?: string }) {
  return (
    <View style={styles.wordmark} accessible accessibilityRole="image" accessibilityLabel="YDU Academy">
      <BrandMark size={size * 1.5} />
      <Text style={{ fontFamily: font.semibold, fontSize: size, lineHeight: size * 1.25, color }}>YDU</Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: size,
          lineHeight: size * 1.25,
          color: colors.textMuted,
          marginLeft: -spacing.xs + 2,
        }}>
        Academy
      </Text>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
}));
