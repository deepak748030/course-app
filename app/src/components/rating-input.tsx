/**
 * Rating input: five stars the learner taps, and the same row in a read-only size for showing a
 * rating already given.
 *
 * Motion is Reanimated only (the app's rule): the star that was just picked springs up and settles,
 * and the pop is driven by a shared value read inside the worklet — no React state is touched from a
 * worklet, so the mark stays smooth while the list re-renders around it. Under reduced motion the
 * star simply changes colour.
 *
 * Each star is its own 52pt target, so the row is comfortably tappable and reads as a radio group to
 * a screen reader (radio, with `checked`, plus the spoken label "4 stars").
 */
import { Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { createStyles, colors, layout, radius } from '@/constants/theme';
import { useT } from '@/i18n';
import { feedback } from '@/lib/util';

const STARS = [1, 2, 3, 4, 5] as const;

/** Sizes: the tappable row, and the smaller row used to show a rating on a card. */
const INPUT_SIZE = 52;
const INPUT_GLYPH = 34;

export function RatingInput({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  const t = useT();
  const reduced = useReducedMotion();
  // 0 -> 1 on every pick: sin(pi * pop) lifts the tapped star and brings it back to rest.
  const pop = useSharedValue(0);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.22 * Math.sin(Math.PI * pop.value) }],
  }));

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('Your rating')}>
      {STARS.map((star) => {
        const chosen = star <= value;
        const isLastPicked = star === value;
        return (
          <Pressable
            key={star}
            accessibilityRole="radio"
            accessibilityState={{ checked: isLastPicked }}
            accessibilityLabel={t('{n} stars', { n: star })}
            onPress={() => {
              feedback.select();
              onChange(star);
              if (reduced) return;
              pop.value = 0;
              pop.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
            }}
            style={({ pressed }) => [styles.target, pressed && styles.pressed]}>
            <Animated.View style={isLastPicked ? popStyle : undefined}>
              <Star
                size={INPUT_GLYPH}
                color={chosen ? colors.gold : colors.textSubtle}
                fill={chosen ? colors.gold : 'none'}
                strokeWidth={chosen ? 0 : 1.6}
              />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The same row, read-only: a card that shows the rating the learner already gave. */
export function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.displayRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {STARS.map((star) => (
        <Star
          key={star}
          size={size}
          color={star <= value ? colors.gold : colors.border}
          fill={star <= value ? colors.gold : 'none'}
          strokeWidth={star <= value ? 0 : 1.4}
        />
      ))}
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  target: {
    width: INPUT_SIZE,
    height: INPUT_SIZE,
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.7 },
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));
