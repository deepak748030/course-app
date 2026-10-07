/**
 * Offer mark — the animated badge that says a course is discounted.
 *
 * The animation is a real Lottie composition (`assets/lottie/offer.json`) played by a Lottie
 * runtime, not a CSS keyframe animation and not a GIF. The drawing fills about three quarters of
 * its square (see the generator's FIT factor), so the badge around it can stay tight:
 *   - Android / iOS: `lottie-react-native` renders it with the native Lottie cores,
 *   - web: `lottie-web` renders it with its SVG renderer (see `offer-lottie.web.tsx` for why the
 *     WASM player is avoided — it loads its runtime from a public CDN).
 *   - either way the composition is bundled with the app, so the badge animates offline.
 *
 * The file is authored in-repo by `scripts/generate-lottie-offer.mjs`, in the LottieFiles style the
 * design references: a tag tilted inside a slowly pulsing ring, with two twinkles. See that script for
 * why it is authored rather than downloaded.
 *
 * The mark is a price tag with an eyelet punched out of it: a discount is better said with a tag than
 * with the same `%` the badge already spells out as "OFF".
 *
 * If the animation cannot run — reduced motion is on, the renderer fails to start — the same mark
 * falls back to a static tag glyph from the icon set, so the badge always reads correctly. A render
 * error is caught by a boundary here rather than being allowed to take the screen down.
 */
import { useT } from '@/i18n';

import { Tag } from 'lucide-react-native';
import { Component, useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { OfferLottie } from '@/components/offer-lottie';
import { createStyles, colors, radius, spacing, tabularNums, type } from '@/constants/theme';

// Metro inlines the composition, so there is no file to fetch at run time.
const OFFER_ANIMATION = require('@/assets/lottie/offer.json');

type Tone = 'onYellow' | 'onSurface' | 'onImage';

/**
 * Brand yellow, fixed in both themes.
 *
 * The offer mark is the one piece of artwork that does not follow the theme: the Lottie animation
 * is drawn in ink and amber, so it needs the yellow ground in the green theme too (ink on the deep
 * green accent would all but disappear). Everything else on the screen changes with the theme.
 */
const BRAND_YELLOW = '#FFC629';
const BRAND_YELLOW_SOFT = '#FFF4CC';

/**
 * Optical spacing inside the mark.
 *
 * The tag is a drawing, not a font glyph, and its ink reaches the edge of its box — so the gaps
 * beside it are set by eye (4px), not by the 4px block rhythm, and the yellow ground hugs the mark
 * instead of framing it. This is why the pill is narrower than the 8px-padding baseline: every pixel
 * here is inside one small mark, not between two blocks of content.
 */
const MARK_GAP = 4;
const BADGE_SIDE = 7;

const TONES: Record<Tone, string> = {
  /** Ink mark on the brand yellow pill: the combination used on course artwork. */
  onYellow: '#1F1B0E',
  /** Dark amber mark on the warm surface tone, for pills that sit on white. */
  onSurface: '#8A6200',
  /** Straight on artwork (the course hero), where the badge itself would be a pasted-on box. */
  onImage: '#FFFFFF',
};

/** Keeps one broken animation from taking a screen down with it. */
class AnimationBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The animation on its own. `size` is the square it is drawn into; the mark covers most of that
 * square, so 20px already reads clearly and 28px is a decision-point size.
 */
export function OfferGlyph({ size = 20, tone = 'onYellow' }: { size?: number; tone?: Tone }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const tint = TONES[tone];
  // Stable identity: the player recreates its animation when this prop changes.
  const markFailed = useCallback(() => setFailed(true), []);

  const still = reduced || failed;
  if (still) {
    return (
      <View style={styles.glyphBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Tag size={Math.round(size * 0.78)} color={tint} strokeWidth={2.7} />
      </View>
    );
  }

  return (
    <View style={styles.glyphBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimationBoundary onFail={markFailed}>
        <OfferLottie size={size} data={OFFER_ANIMATION} onFail={markFailed} />
      </AnimationBoundary>
    </View>
  );
}

/**
 * The mark's contents — the percentages are never written with a "%" character anywhere in the app.
 *
 *   `33`   bold, in the theme accent
 *   the animated percent mark, exactly where the "%" would sit
 *   `OFF`  uppercase
 *
 * The colour follows the theme by default (deep amber on white+yellow, deep green on white+green);
 * the course hero passes the on-image colour instead, because it sits on artwork.
 */
export function OfferMark({
  percent,
  glyph = 20,
  tone = 'onYellow',
  color = colors.accentText,
}: {
  percent: number;
  glyph?: number;
  tone?: Tone;
  color?: string;
}) {
  const t = useT();

  return (
    <View
      style={styles.mark}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={[type.bodyStrong, tabularNums, { color }]}>{percent}</Text>
      <OfferGlyph size={glyph} tone={tone} />
      <Text style={[type.overline, { color }]}>{t("OFF")}</Text>
    </View>
  );
}

/** Yellow pill with the animated tag and the percentage: course artwork, price lines, buy bars. */
export function OfferBadge({
  percent,
  tone = 'onYellow',
  size = 'sm',
  mark = 'badge',
  style,
}: {
  percent: number;
  tone?: Tone;
  /** `sm` for artwork corners, `md` for a decision point like the buy bar. */
  size?: 'sm' | 'md';
  /**
   * `badge` is the full mark — number, animated tag, `OFF` — for artwork and buy bars.
   * `side` drops the label for the one place a badge sits inside a line of text (a list row's price
   * line), where the row already says what the number is.
   */
  mark?: 'badge' | 'side';
  style?: StyleProp<ViewStyle>;
}) {
  const tags = { badge: 20, side: 18, md: 24 } as const;
  const glyph = size === 'md' ? tags.md : mark === 'side' ? tags.side : tags.badge;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${percent} percent off`}
      style={[styles.badge, size === 'md' && styles.badgeMd, tone === 'onSurface' && styles.badgeSurface, style]}>
      {mark === 'side' ? (
        <View style={styles.mark}>
          <Text style={[type.bodyStrong, tabularNums, { color: TONES[tone] }]}>{percent}</Text>
          <OfferGlyph size={glyph} tone={tone} />
        </View>
      ) : (
        <OfferMark percent={percent} glyph={glyph} tone={tone} />
      )}
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  /** The three pieces of the mark: number, animated percent glyph, `OFF`. */
  mark: { flexDirection: 'row', alignItems: 'center', gap: MARK_GAP },
  glyphBox: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_YELLOW,
    borderRadius: radius.pill,
    paddingHorizontal: BADGE_SIDE,
    paddingVertical: 3,
  },
  badgeMd: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  badgeSurface: { backgroundColor: BRAND_YELLOW_SOFT },
}));
