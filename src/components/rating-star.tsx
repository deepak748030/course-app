/**
 * The course rating as a big star: it leans left, leans right, settles and rests — and a few fine
 * star motes drift down past it while it does. Reanimated only (no CSS keyframes, no assets), and
 * under reduced motion the star is simply still with no motes at all, so nothing moves for anyone
 * who asked for that.
 *
 * The number sits beside the star in the title size so the rating is readable at a glance; the
 * count under it is the muted review total.
 */

import { Star } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { createStyles, colors, spacing, tabularNums, type } from '@/constants/theme';

/** Motes, how far they fall and how long one fall takes. */
const MOTES = 5;
const MOTE_TRAVEL = 14;
const MOTE_LEFT = [3, 15, 27, 37, 21];
const MOTE_SIZE = [6, 5, 7, 4, 5];
const LOOP_MS = 2600;

export function RatingStar({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const fall = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      shake.value = 0;
      fall.value = 0;
      return;
    }

    // A nudge: the long rest between shakes is what keeps it charming instead of twitchy.
    shake.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500 }),
        withTiming(-1, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(-0.6, { duration: 90 }),
        withTiming(0.35, { duration: 80 }),
        withTiming(0, { duration: 70 }),
      ),
      -1,
      false,
    );
    fall.value = withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false);
  }, [fall, reduced, shake]);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 3 }, { rotate: `${shake.value * 11}deg` }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={
        reviewCount === undefined
          ? `Rated ${rating} out of 5`
          : `Rated ${rating} out of 5 from ${reviewCount.toLocaleString('en-IN')} reviews`
      }
      style={styles.block}>
      <View style={styles.starBox}>
        {reduced
          ? null
          : MOTE_LEFT.map((left, index) => <Mote key={left} progress={fall} index={index} left={left} />)}
        <Animated.View style={starStyle}>
          <Star size={36} color={colors.gold} fill={colors.gold} strokeWidth={0} />
        </Animated.View>
      </View>
      <View style={styles.text}>
        <Text style={[type.title, tabularNums, { color: colors.text }]}>{rating.toFixed(1)}</Text>
        {reviewCount === undefined ? null : (
          <Text style={[type.label, tabularNums, { color: colors.textSubtle }]}>
            ({reviewCount.toLocaleString('en-IN')})
          </Text>
        )}
      </View>
    </View>
  );
}

/** One falling star mote: fades in, drifts down and sideways, fades out, then starts over. */
function Mote({ progress, index, left }: { progress: SharedValue<number>; index: number; left: number }) {
  const mote = useAnimatedStyle(() => {
    // Each mote runs the same loop from a different phase, so they never fall in a line.
    const phase = (progress.value + index / MOTES) % 1;
    return {
      opacity: phase < 0.2 ? phase * 2.4 : (1 - phase) * 0.6,
      transform: [
        { translateY: phase * MOTE_TRAVEL },
        { translateX: Math.sin(phase * Math.PI * 2 + index) * 3 },
        { scale: 0.6 + (1 - phase) * 0.5 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.mote, { left }, mote]}>
      <Star size={MOTE_SIZE[index % MOTE_SIZE.length]} color={colors.gold} fill={colors.gold} strokeWidth={0} />
    </Animated.View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  block: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  /** One star's worth of room, so the motes fall inside the row instead of over the title. */
  starBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mote: { position: 'absolute', top: 9, pointerEvents: 'none' },
  text: { alignItems: 'flex-start' },
}));
