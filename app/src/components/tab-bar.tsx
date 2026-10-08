/**
 * Bottom tab bar: four destinations, 56px + bottom safe area, hairline top border, no shadow.
 *
 * The active state is a *token* rather than a tint: a compact capsule filled with the theme accent,
 * the tab's filled icon sitting in it in the on-accent colour. It is drawn over the icons, so it
 * sweeps across them cleanly instead of sliding under them (a grey icon riding on the accent read as
 * mud), and the icon inside it cross-fades from the tab it leaves to the tab it lands on.
 *
 * It moves fast: a stiff spring settles in about 160ms, the icon inside the capsule cross-fades
 * while it flies, and the capsule stretches ~10% for the duration of the trip — enough to read as a
 * quick throw without overshooting. Under reduced motion none of it animates: the capsule is simply
 * where the active tab is.
 *
 * All animation state lives in shared values read by useAnimatedStyle worklets — nothing inside a
 * worklet calls React state (see scripts/selfcheck.ts, "worklet callbacks and hook bodies").
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { feedback } from '@/lib/util';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Outline at rest, filled when active — the only two states the bar needs. */
const FALLBACK_ICONS: { outline: IoniconName; filled: IoniconName } = { outline: 'ellipse-outline', filled: 'ellipse' };

const ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  home: { outline: 'home-outline', filled: 'home' },
  explore: { outline: 'compass-outline', filled: 'compass' },
  learning: { outline: 'school-outline', filled: 'school' },
  profile: { outline: 'person-outline', filled: 'person' },
};

/**
 * The accent token that marks the active tab.
 *
 * It hugs the icon rather than the whole slot, so the bar reads as four quiet icons with one filled
 * one. The top keeps it centred on the icon row (the item's padding plus half the 24px icon box).
 */
const CAPSULE_WIDTH = 44;
const CAPSULE_HEIGHT = 30;
const ICON_BOX = 24;
const ITEM_TOP = spacing.xs + 2;
const CAPSULE_TOP = ITEM_TOP + ICON_BOX / 2 - CAPSULE_HEIGHT / 2;

type TabBarNavigation = {
  // React Navigation internals, typed loosely on purpose: this bar must not depend on its private
  // types, and both calls are guarded below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (...args: any[]) => void;
};

export type TabBarProps = {
  state: { index: number; routes: readonly { key: string; name: string }[] };
  descriptors: Record<string, { options?: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: TabBarNavigation;
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const progress = useSharedValue(state.index);
  /** 1 while the capsule is mid-flight, which is what stretches it. */
  const travel = useSharedValue(0);
  const hidden = useSharedValue(0);

  const itemWidth = width > 0 ? width / Math.max(1, state.routes.length) : 0;

  useEffect(() => {
    if (reduced) {
      progress.value = state.index;
      travel.value = 0;
      return;
    }
    // Stiff and heavily damped: it arrives in ~160ms and does not wobble past the target.
    progress.value = withSpring(state.index, { damping: 30, stiffness: 520, mass: 0.55 });
    travel.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 220 }));
  }, [progress, reduced, state.index, travel]);

  useEffect(() => {
    hidden.value = withTiming(keyboardOpen ? 1 : 0, { duration: 180 });
  }, [hidden, keyboardOpen]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: itemWidth > 0 ? 1 : 0,
    transform: [
      { translateX: (itemWidth - CAPSULE_WIDTH) / 2 + progress.value * itemWidth },
      // A short stretch, centred on the capsule, while it is on the move.
      { scaleX: 1 + 0.18 * travel.value },
    ],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (layout.tabBarHeight + insets.bottom) }],
  }));

  return (
    <Animated.View
      style={[styles.bar, { height: layout.tabBarHeight + insets.bottom, paddingBottom: insets.bottom }, barStyle]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options;
        // One-word visual label; the spoken label can be fuller ("My learning").
        const label = options?.title ?? route.name;
        const spokenLabel = options?.tabBarAccessibilityLabel ?? label;
        const icons = ICONS[route.name] ?? FALLBACK_ICONS;
        const focused = state.index === index;

        return (
          <TabItem
            key={route.key}
            icons={icons}
            index={index}
            focused={focused}
            label={label}
            spokenLabel={spokenLabel}
            progress={progress}
            onPress={() => {
              feedback.select();
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event?.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}

      {/* Painted last on purpose: the token passes over the icons rather than under them. It is
          decorative and untouchable, so the tabs underneath keep every tap. */}
      {itemWidth > 0 ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.capsule, styles.noTouch, capsuleStyle]}>
          {state.routes.map((route, index) => (
            <CapsuleIcon
              key={route.key}
              icons={ICONS[route.name] ?? FALLBACK_ICONS}
              index={index}
              progress={progress}
            />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** One glyph inside the token; only the tab the token is over is visible. */
function CapsuleIcon({
  icons,
  index,
  progress,
}: {
  icons: { outline: IoniconName; filled: IoniconName };
  index: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(progress.value - index));
    // A slightly sharper curve than the item icons, so exactly one glyph reads inside the token.
    return { opacity: Math.pow(near, 1.6) };
  });

  return (
    <Animated.View style={[styles.capsuleIcon, style]}>
      <Ionicons name={icons.filled} size={22} color={colors.onAccent} />
    </Animated.View>
  );
}

function TabItem({
  icons,
  index,
  focused,
  label,
  spokenLabel,
  progress,
  onPress,
}: {
  icons: { outline: IoniconName; filled: IoniconName };
  index: number;
  focused: boolean;
  label: string;
  spokenLabel: string;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const filled = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(progress.value - index));
    return { opacity: near, transform: [{ scale: 1 + 0.06 * near }] };
  });

  const outline = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(progress.value - index));
    return { opacity: 1 - near, transform: [{ scale: 1 + 0.06 * near }] };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={spokenLabel}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.iconLayer, outline]}>
          <Ionicons name={icons.outline} size={24} color={colors.textMuted} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, filled]}>
          <Ionicons name={icons.filled} size={24} color={colors.accentText} />
        </Animated.View>
      </View>
      <Text
        style={[focused ? type.navLabelActive : type.navLabel, { color: focused ? colors.accentText : colors.textMuted }]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = createStyles(() => StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  /* The active token: theme accent, icon-sized, pill shaped, drawn over the icons. */
  capsule: {
    position: 'absolute',
    left: 0,
    top: CAPSULE_TOP,
    width: CAPSULE_WIDTH,
    height: CAPSULE_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  item: {
    flex: 1,
    height: layout.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: ITEM_TOP,
    gap: 2,
  },
  itemPressed: { opacity: 0.85 },
  iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
}));
