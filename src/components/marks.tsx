/**
 * Brand marks: a cooking bowl with rising steam and a play triangle, drawn as vector
 * geometry so it stays crisp at every size. No emoji, no raster logo.
 * The same geometry is used to generate the app icon (scripts/generate-brand-assets.sh).
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { colors, font, spacing } from '@/constants/theme';

export function BrandMark({ size = 40, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityRole="image" accessibilityLabel="Rasoi Studio">
      {/* steam */}
      <Path d="M16.1 24.6 C17.6 22.7 14.6 21 16.1 18.6" stroke={color} strokeWidth={1.25} strokeLinecap="round" fill="none" />
      <Path d="M32.3 24.6 C33.8 22.7 30.8 21 32.3 18.6" stroke={color} strokeWidth={1.25} strokeLinecap="round" fill="none" />
      {/* play triangle */}
      <Polygon points="21.8,17.3 21.8,23.1 26.8,20.2" fill={color} stroke={color} strokeWidth={2.25} strokeLinejoin="round" />
      {/* bowl rim and body */}
      <Path d="M11.4 26.6 H36.6" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <Path d="M13.5 26.6 Q24 39.2 34.5 26.6" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Wordmark: semibold name, regular suffix — one family, two weights, nothing else. */
export function Wordmark({ size = 22, color = colors.text }: { size?: number; color?: string }) {
  return (
    <View style={styles.wordmark} accessible accessibilityRole="image" accessibilityLabel="Rasoi Studio">
      <BrandMark size={size * 1.5} />
      <Text style={{ fontFamily: font.semibold, fontSize: size, lineHeight: size * 1.25, color }}>Rasoi</Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: size,
          lineHeight: size * 1.25,
          color: colors.textMuted,
          marginLeft: -spacing.xs + 2,
        }}>
        Studio
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
