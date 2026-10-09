/**
 * Animated icons.
 *
 * Every glyph here is a lucide glyph wrapped in motion driven by Reanimated: one shared value
 * loops on the UI thread and the wrapper transforms with it. No CSS animations, no keyframes, no
 * animation asset pipeline — and every loop collapses to a static icon under reduced motion.
 *
 * Motions are deliberately few and short so icons read as a family:
 *   swing    the bell rocks and rests, like a notification arriving
 *   flicker  a flame breathes (scale + opacity)
 *   pop      a sparkle scales up and fades back
 *   bob      a small vertical hop (cart, tags)
 *   pulse    an even heartbeat for check marks in lists and fact rows
 */

import type { LucideIcon } from 'lucide-react-native';
import { Bell, BellRing, CircleCheck, Flame, ShoppingCart, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type IconMotion = 'pulse' | 'pop' | 'swing' | 'flicker' | 'bob';

export type AnimatedIconProps = {
  size?: number;
  color: string;
  strokeWidth?: number;
  motion?: IconMotion;
  /** Set false to keep the icon still (e.g. a disabled state). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The loop for each motion. Values run 0 -> 1 unless the motion swings both ways. */
function loopFor(motion: IconMotion) {
  switch (motion) {
    case 'swing':
      return withRepeat(
        withSequence(
          withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
          withTiming(-1, { duration: 280, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.55, { duration: 220, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 180, easing: Easing.inOut(Easing.quad) }),
          // Rest between rings, so the icon is not constantly wiggling in the header.
          withTiming(0, { duration: 1700 }),
        ),
        -1,
        false,
      );
    case 'flicker':
      return withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    case 'pop':
      return withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        true,
      );
    case 'bob':
      return withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    default:
      return withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
  }
}

export function AnimatedIcon({
  icon: Icon,
  size = 16,
  color,
  strokeWidth = 1.9,
  motion = 'pulse',
  animated = true,
  style,
}: AnimatedIconProps & { icon: LucideIcon }) {
  const reduced = useReducedMotion();
  const still = reduced || !animated;
  const value = useSharedValue(0);

  useEffect(() => {
    if (still) {
      value.value = 0;
      return;
    }
    value.value = loopFor(motion);
  }, [still, motion, value]);

  const animatedStyle = useAnimatedStyle(() => {
    const v = value.value;
    switch (motion) {
      case 'swing':
        return { transform: [{ rotate: `${v * 14}deg` }] };
      case 'flicker':
        return { transform: [{ scaleY: 0.94 + v * 0.1 }, { scaleX: 1 - v * 0.05 }], opacity: 0.85 + v * 0.15 };
      case 'pop':
        return { transform: [{ scale: 0.84 + v * 0.26 }, { rotate: `${(1 - v) * -8}deg` }], opacity: 0.7 + v * 0.3 };
      case 'bob':
        return { transform: [{ translateY: -1.6 * v }, { rotate: `${v * -5}deg` }] };
      default:
        return { transform: [{ scale: 1 + v * 0.08 }], opacity: 0.8 + v * 0.2 };
    }
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Icon size={size} color={color} strokeWidth={strokeWidth} />
    </Animated.View>
  );
}

type PresetProps = Omit<AnimatedIconProps, 'motion'>;

/** Notification bell: rocks, then rests. */
export const AnimatedBell = (props: PresetProps) => <AnimatedIcon icon={Bell} motion="swing" {...props} />;

/** Ringing bell: the header notification icon. The swinging glyph replaces the static one. */
export const AnimatedBellRing = (props: PresetProps) => <AnimatedIcon icon={BellRing} motion="swing" {...props} />;

/** Sparkle: used on offer badges and "new" markers. */
export const AnimatedSparkle = (props: PresetProps) => <AnimatedIcon icon={Sparkles} motion="pop" {...props} />;

/** Cart: small hop, used on buy actions. */
export const AnimatedCart = (props: PresetProps) => <AnimatedIcon icon={ShoppingCart} motion="bob" {...props} />;

/** Check mark: used before list items and course facts. */
export const AnimatedCheck = (props: PresetProps) => <AnimatedIcon icon={CircleCheck} motion="pulse" {...props} />;

/** Flame: used for discount / launch markers. */
export const AnimatedFlame = (props: PresetProps) => <AnimatedIcon icon={Flame} motion="flicker" {...props} />;

