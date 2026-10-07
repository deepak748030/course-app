/**
 * Offer mark — the badge that says a course is discounted.
 *
 * It is text, deliberately: the percentage, a `%`, and `OFF`. No animation, no glyph drawing, no
 * Lottie player — the mark used to play an animated composition, and that was more machinery than a
 * discount needs. Three pieces of type say the same thing, they read at any size, and they cost the
 * bundle nothing.
 *
 * The yellow pill is what makes it read as an offer rather than a price: brand yellow in both themes,
 * because the mark sits on course artwork and everything else on the screen changes with the theme.
 * The gaps inside the pill are set by eye (2px) rather than by the 4px block rhythm — every pixel
 * here is inside one small mark, not between two blocks of content — which is why the pill is
 * narrower than the 8px padding baseline.
 */

import { useT } from '@/i18n';

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { createStyles, radius, spacing, tabularNums, type } from '@/constants/theme';

type Tone = 'onYellow' | 'onSurface' | 'onImage';

/**
 * The ink inside the mark.
 *
 * `onYellow` is ink on the brand yellow pill: the combination used on course artwork.
 * `onSurface` is the same mark on the warm surface tone, for pills that sit on white.
 * `onImage` is for the course hero, where the mark sits straight on the artwork with no pill.
 */
const TONES: Record<Tone, string> = {
  onYellow: '#1F1B0E',
  onSurface: '#8A6200',
  onImage: '#FFFFFF',
};

/** Brand yellow, fixed in both themes (see the note at the top). */
const BRAND_YELLOW = '#FFC629';
const BRAND_YELLOW_SOFT = '#FFF4CC';

/** Optical spacing inside the mark: 2px between the number, the sign and the label. */
const MARK_GAP = 2;
const BADGE_SIDE = 6;

/**
 * The mark's contents: `33`, `%`, `OFF` — the percentage is never written with a "%" character
 * anywhere else in the app, and here it is a plain character, not a drawing.
 */
export function OfferMark({
  percent,
  tone = 'onYellow',
  color,
}: {
  percent: number;
  tone?: Tone;
  /** Overrides the tone: used where the mark has to match other copy on the same colour. */
  color?: string;
}) {
  const t = useT();
  const ink = color ?? TONES[tone];

  return (
    <View
      style={styles.mark}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={[type.bodyStrong, tabularNums, { color: ink }]}>{percent}</Text>
      <Text style={[type.labelStrong, { color: ink }]}>%</Text>
      <Text style={[type.overline, { color: ink }]}>{t("OFF")}</Text>
    </View>
  );
}

/** Yellow pill with the percentage: used on course artwork, price lines and buy bars. */
export function OfferBadge({
  percent,
  tone = 'onYellow',
  size = 'sm',
  mark = 'badge',
  style,
}: {
  percent: number;
  tone?: Tone;
  /** `sm` for artwork corners and price lines, `md` for a decision point like the buy bar. */
  size?: 'sm' | 'md';
  /**
   * `badge` is the full mark — number, `%`, `OFF` — for artwork and buy bars.
   * `side` drops the label for the one place a badge sits inside a line of text (a list row's price
   * line), where the row already says what the number is.
   */
  mark?: 'badge' | 'side';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useT();
  const ink = TONES[tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${percent} percent off`}
      style={[
        styles.badge,
        size === 'md' && styles.badgeMd,
        tone === 'onSurface' && styles.badgeSurface,
        style,
      ]}>
      <View
        style={styles.mark}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Text style={[type.bodyStrong, tabularNums, { color: ink }]}>{percent}</Text>
        <Text style={[type.labelStrong, { color: ink }]}>%</Text>
        {mark === 'badge' ? (
          <Text style={[type.overline, { color: ink }]}>{t("OFF")}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  /** The pieces of the mark: number, `%`, `OFF`. */
  mark: { flexDirection: 'row', alignItems: 'center', gap: MARK_GAP },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_YELLOW,
    borderRadius: radius.pill,
    paddingHorizontal: BADGE_SIDE,
    paddingVertical: 2,
  },
  badgeMd: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  badgeSurface: { backgroundColor: BRAND_YELLOW_SOFT },
}));
