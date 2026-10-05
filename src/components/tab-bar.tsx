/**
 * Bottom tab bar: four destinations, 56px + bottom safe area, hairline top border, no shadow.
 *
 * Per the tab bar rules: the active tab is a *filled* icon in the accent colour with a semibold
 * label, inactive tabs are outline icons in a muted colour with a regular label, and labels stay
 * one word. The interaction is the only animation in the bar: a soft yellow pill slides between
 * tabs on a spring while the icon cross-fades outline -> filled and lifts slightly.
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
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing, type } from '@/constants/theme';
import { feedback } from '@/lib/util';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Outline at rest, filled when active — the only two states the bar needs. */
const ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  home: { outline: 'home-outline', filled: 'home' },
  explore: { outline: 'compass-outline', filled: 'compass' },
  learning: { outline: 'school-outline', filled: 'school' },
  profile: { outline: 'person-outline', filled: 'person' },
};

/** Horizontal inset of the sliding pill inside one tab slot. */
const PILL_INSET = 14;
const PILL_HEIGHT = 32;

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
  const hidden = useSharedValue(0);

  const itemWidth = width > 0 ? width / Math.max(1, state.routes.length) : 0;

  useEffect(() => {
    progress.value = reduced ? state.index : withSpring(state.index, { damping: 20, stiffness: 220, mass: 0.7 });
  }, [progress, reduced, state.index]);

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

  const pillStyle = useAnimatedStyle(() => ({
    opacity: itemWidth > 0 ? 1 : 0,
    transform: [{ translateX: PILL_INSET + progress.value * itemWidth }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * (layout.tabBarHeight + insets.bottom) }],
  }));

  return (
    <Animated.View
      style={[styles.bar, { height: layout.tabBarHeight + insets.bottom, paddingBottom: insets.bottom }, barStyle]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: itemWidth - PILL_INSET * 2 }, pillStyle]}
        />
      ) : null}

      {state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options;
        // One-word visual label; the spoken label can be fuller ("My learning").
        const label = options?.title ?? route.name;
        const spokenLabel = options?.tabBarAccessibilityLabel ?? label;
        const icons = ICONS[route.name] ?? { outline: 'ellipse-outline' as IoniconName, filled: 'ellipse' as IoniconName };
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: spacing.xs + 2,
    height: PILL_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  item: {
    flex: 1,
    height: layout.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xs + 2,
    gap: 2,
  },
  itemPressed: { opacity: 0.85 },
  iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
