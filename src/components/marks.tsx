/**
 * Brand marks: the YDU Academy logo, drawn as vector geometry so it stays crisp at every size.
 *
 * The artwork is a milk can with two leaves behind it and the name under it — a white disc, the can
 * and its two leaves, then YDU and ACADEMY. It is the same drawing that
 * `scripts/generate-brand-icons.mjs` rasterises into the launcher icon, the splash icon, the favicon
 * and the PNGs in assets/images, and `scripts/selfcheck.ts` compares the two files so they cannot
 * drift apart: change the geometry here, run the generator, and every icon follows.
 *
 * Two shapes are on offer:
 *   - `BrandMark` — the mark on its own (can and leaves), for headers, tiles and footers. It carries
 *     the brand's green gradient; pass `color` to flatten it to one colour when it sits on something
 *     that is already brand-coloured (the poster's lock-up, a yellow tile).
 *   - `Wordmark` — the mark and the name together, for places wide enough to spell the brand out.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { createStyles, colors, font, spacing } from '@/constants/theme';

/** The brand's own green — fixed, not themed: a logo that changed with the app's theme is not a logo. */
export const BRAND_GREEN = '#0B5C1E';
const BRAND_GREEN_DEEP = '#08430F';
const BRAND_LEAF = '#6FCB6A';

/** The square everything is drawn in, matching the generator. */
const BOX = 1000;

/**
 * Two leaves behind the can: lens-shaped, tips up and out, each with a vein.
 * Kept in step with scripts/generate-brand-icons.mjs (asserted by scripts/selfcheck.ts).
 */
const LEAF_PATHS = [
  'M 402 560 Q 198 476 164 226 Q 328 344 402 560 Z',
  'M 598 560 Q 802 476 836 226 Q 672 344 598 560 Z',
];
const LEAF_VEINS = ['M 386 534 Q 246 424 196 262', 'M 614 534 Q 754 424 804 262'];

/** The two handles, drawn over the shoulders — the detail that makes it read as a milk can. */
const HANDLE_PATHS = [
  'M 352 212 C 302 226 290 288 290 352 C 290 414 314 456 366 466',
  'M 648 212 C 698 226 710 288 710 352 C 710 414 686 456 634 466',
];

/** The can: two handles over the shoulders, a wide lid, a neck and a tapering body. */
const CAN_PATHS = [
  'M 356 274 L 644 274 L 660 322 L 634 552 Q 632 562 620 562 L 380 562 Q 368 562 366 552 L 340 322 Z',
];

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
          <Path key={d} d={d} fill="none" stroke={color} strokeWidth={24} strokeLinecap="round" />
        ))}
        <Rect x={318} y={168} width={364} height={58} rx={20} fill={color} />
        <Rect x={350} y={226} width={300} height={48} fill={color} />
        {CAN_PATHS.map((d) => (
          <Path key={d} d={d} fill={color} />
        ))}
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
        <LinearGradient id="brandCan" x1="0" y1="120" x2="0" y2="620" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2E8B3A" />
          <Stop offset="0.45" stopColor="#12702A" />
          <Stop offset="1" stopColor={BRAND_GREEN_DEEP} />
        </LinearGradient>
        <LinearGradient id="brandLeaf" x1="0" y1="580" x2="0" y2="240" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2E9E3D" />
          <Stop offset="1" stopColor={BRAND_LEAF} />
        </LinearGradient>
      </Defs>

      {LEAF_PATHS.map((d) => (
        <Path key={d} d={d} fill="url(#brandLeaf)" />
      ))}
      {LEAF_VEINS.map((d) => (
        <Path key={d} d={d} fill="none" stroke="#EDF9EA" strokeWidth={6} strokeLinecap="round" opacity={0.45} />
      ))}
      {HANDLE_PATHS.map((d) => (
        <Path key={d} d={d} fill="none" stroke="url(#brandCan)" strokeWidth={24} strokeLinecap="round" />
      ))}
      <Rect x={318} y={168} width={364} height={58} rx={20} fill="url(#brandCan)" />
      <Rect x={350} y={226} width={300} height={48} fill="url(#brandCan)" opacity={0.94} />
      {CAN_PATHS.map((d) => (
        <Path key={d} d={d} fill="url(#brandCan)" />
      ))}
      <Rect x={352} y={332} width={296} height={7} fill="#FFFFFF" opacity={0.26} />
    </Svg>
  );
}

/** The lockup: the mark above the name, with the accent rule the poster uses. */
export function BrandLockup({
  width = 200,
  title = 'YDU',
  subtitle = 'ACADEMY',
}: {
  width?: number;
  title?: string;
  subtitle?: string;
}) {
  return (
    <View style={[styles.lockup, { width }]} accessible accessibilityRole="image" accessibilityLabel="YDU Academy">
      <BrandMark size={width * 0.62} />
      <Text style={[styles.name, { fontSize: width * 0.26, lineHeight: width * 0.3, color: BRAND_GREEN }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.suffix,
          { fontSize: width * 0.088, lineHeight: width * 0.12, color: BRAND_GREEN, letterSpacing: width * 0.012 },
        ]}>
        {subtitle}
      </Text>
    </View>
  );
}

/** Wordmark: semibold name, regular suffix — one family, two weights, nothing else. */
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
  lockup: { alignItems: 'center', gap: spacing.xs },
  name: { fontFamily: font.semibold, textAlign: 'center' },
  suffix: { fontFamily: font.semibold, textAlign: 'center' },
}));
