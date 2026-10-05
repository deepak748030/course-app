/**
 * Brand marks: a milk can with a play triangle on its face and a drop below it, drawn as vector
 * geometry so it stays crisp at every size. No emoji, no raster logo.
 * The same geometry is used to generate the app icon (scripts/generate-brand-assets.sh).
 *
 * The can is deliberately the old milk-can silhouette rather than a canister: it reads as dairy at
 * 24px, and the drop underneath is what makes it a mark rather than an illustration.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { createStyles, colors, font, spacing } from '@/constants/theme';

export function BrandMark({ size = 40, color = colors.accentText }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityRole="image" accessibilityLabel="YDU Academy">
      {/* drop under the can */}
      <Path d="M 24,35.9 C 22.3,38.4 21.1,39.8 21.1,41 C 21.1,42.7 22.4,43.9 24,43.9 C 25.6,43.9 26.9,42.7 26.9,41 C 26.9,39.8 25.7,38.4 24,35.9 Z" fill={color} />
      {/* lid plate and neck */}
      <Path d="M 15.5,10 H 32.5 V 13.4 H 15.5 Z" fill={color} />
      <Path d="M 17.8,13.4 H 30.2 V 16.5 H 17.8 Z" fill={color} />
      {/* shoulder and can body */}
      <Path d="M 17.8,16.5 H 30.2 L 33.9,20.6 V 32.8 Q 33.9,35.2 31.5,35.2 H 16.5 Q 14.1,35.2 14.1,32.8 V 20.6 Z" fill={color} />
      {/* play triangle knocked out of the can face */}
      <Polygon points="21.2,22.5 21.2,29.3 27.2,25.9" fill={colors.surface} />
      {/* lid handle */}
      <Path d="M 18.6,7 C 20.6,4 27.4,4 29.4,7" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
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
}));
