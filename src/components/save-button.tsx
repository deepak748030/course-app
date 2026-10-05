/**
 * Save button: the bookmark toggle used on course cards, the course hero, the lesson batch sheet
 * and the saved list.
 *
 * Every tap does three things at once, all Reanimated (no CSS, no assets) — saving and removing
 * alike, so the icon reacts wherever it is touched:
 *   - the glyph pops — scale up past the icon size, then settle back below it;
 *   - eight motes fly out left and right on a wide arc, in the theme accent, fading and shrinking
 *     as they go, plus a ring that opens behind the button, so a tap reads as a small celebration
 *     rather than a silent state change;
 *   - the button itself gives the usual press feedback.
 *
 * The motes are inert while they wait — progress 0 draws nothing — so mounting them up front costs
 * nothing but keeps the burst on the very first frame of the tap. Under reduced motion they are
 * not rendered at all and the glyph swaps with no spring.
 */

import { Bookmark, BookmarkCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { createStyles, colors, layout, radius } from '@/constants/theme';
import { feedback } from '@/lib/util';

/** Motes: how many, how far they travel, and how long the burst takes. */
const MOTES = 8;
const SPRINKLE_DISTANCE = 34;
const BURST_MS = 680;

export function SaveButton({
  saved,
  onToggle,
  accessibilityLabel,
  variant = 'plain',
  size = layout.touchTarget,
  iconSize = 20,
}: {
  saved: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'soft' | 'onImage';
  size?: number;
  iconSize?: number;
}) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(0);
  const burst = useSharedValue(0);

  /** Fired straight from the tap: grow, settle back with a small overshoot, and let the motes fly. */
  const celebrate = () => {
    if (reduced) return;
    pop.value = withSequence(
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 260, easing: Easing.out(Easing.back(2)) }),
    );
    burst.value = 0;
    burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.quad) });
  };

  // Progress is clamped: an animation that has not started yet must never draw an inverted burst.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + clamp(pop.value, -0.18, 1) * 0.45 }],
  }));
  const ringStyle = useAnimatedStyle(() => {
    const t = clamp(burst.value, 0, 1);
    return {
      opacity: t === 0 || t === 1 ? 0 : (1 - t) * 0.5,
      transform: [{ scale: 0.4 + t * 1.9 }],
    };
  });

  const bg = variant === 'soft' ? colors.surfaceAlt : variant === 'onImage' ? colors.scrim : 'transparent';
  const glyphColor = variant === 'onImage' ? colors.textInverse : saved ? colors.accentText : colors.text;

  return (
    <View style={styles.wrap}>
      {/* Sprinklers sit behind the button so the glyph stays crisp while they fly. */}
      {!reduced
        ? Array.from({ length: MOTES }, (_, index) => (
            <Sprinkle key={index} index={index} progress={burst} colour={colors.accentText} />
          ))
        : null}
      {!reduced ? <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: saved }}
        hitSlop={8}
        onPress={() => {
          feedback.tap();
          celebrate();
          onToggle();
        }}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Animated.View style={iconStyle}>
          {saved ? (
            <BookmarkCheck size={iconSize} color={glyphColor} strokeWidth={1.9} />
          ) : (
            <Bookmark size={iconSize} color={glyphColor} strokeWidth={1.9} />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** One mote: flies out along its own angle, fades and shrinks. Left and right, never straight up. */
function Sprinkle({ index, progress, colour }: { index: number; progress: SharedValue<number>; colour: string }) {
  // Spread the eight motes over a wide fan: 150° to 30°, so they leave the sides of the icon.
  const angle = (150 - (index * 120) / (MOTES - 1)) * (Math.PI / 180);
  const distance = SPRINKLE_DISTANCE * (0.72 + (index % 3) * 0.16);
  const dx = Math.round(Math.cos(angle) * distance);
  const dy = Math.round(-Math.sin(angle) * distance);

  const style = useAnimatedStyle(() => {
    const t = clamp(progress.value, 0, 1);
    return {
      opacity: t === 0 || t === 1 ? 0 : 1 - t,
      transform: [{ translateX: dx * t }, { translateY: dy * t }, { scale: 1 - t * 0.55 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sprinkle, index % 2 === 0 ? styles.sprinkleRound : styles.sprinkleSliver, { backgroundColor: colour }, style]}
    />
  );
}

const styles = createStyles(() => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  /** Motes park outside the button box, so the burst is never clipped by the card edge. */
  sprinkle: { position: 'absolute', overflow: 'visible' },
  sprinkleRound: { width: 4, height: 4, borderRadius: 2 },
  sprinkleSliver: { width: 6, height: 2, borderRadius: 1 },
  ring: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accentText,
  },
}));
