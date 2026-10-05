/**
 * Core UI kit for Rasoi Studio.
 *
 * Every value comes from @/constants/theme. Rules honoured here:
 * - No shadows: separation comes from surface colour + 1px hairlines.
 * - Hairline dividers instead of gaps inside data lists (last row has none).
 * - Buttons: 48px tall, radius 8, disabled stays readable rather than just faded.
 * - Sticky bars: flush to the edges, no corner radius, safe-area aware.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ArrowLeft, ChevronDown, ChevronRight, CircleAlert, Info, Search, WifiOff, X } from 'lucide-react-native';
import { Children, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, layout, radius, spacing, tabularNums, type, type TypeToken } from '@/constants/theme';
import { feedback } from '@/lib/util';

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

/** Press compression. Feedback only: under 100ms, skipped with reduced motion. */
export function usePressScale(scaleTo = 0.98) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    style,
    onPressIn: () => {
      if (reduced) return;
      scale.value = withSpring(scaleTo, { damping: 20, stiffness: 360, mass: 0.6 });
    },
    onPressOut: () => {
      if (reduced) return;
      scale.value = withSpring(1, { damping: 18, stiffness: 300, mass: 0.6 });
    },
  };
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export function Screen({
  children,
  scroll = true,
  header,
  footer,
  contentStyle,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.root, style]}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

/** Full-bleed horizontal scroller: no side padding, 8px gaps between items. */
export function Rail({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.rail, contentStyle]}>
      {children}
    </ScrollView>
  );
}

/** Vertical data list: 8px side padding, hairline dividers between rows, none after the last. */
export function DataList({
  children,
  dividerInset = 0,
  style,
}: {
  children: ReactNode;
  /** Align the divider with the row's text when the row has a leading icon or avatar. */
  dividerInset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.list, style]}>
      {rows.map((row, index) => (
        <View key={index}>
          {row}
          {index < rows.length - 1 ? <View style={[styles.listDivider, { marginLeft: dividerInset }]} /> : null}
        </View>
      ))}
    </View>
  );
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
}

/** Header: 56px, hairline bottom, centred single-line title, max two trailing actions. */
export function AppBar({
  title,
  onBack,
  backLabel = 'Go back',
  right,
  borderless = false,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  borderless?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canGoBack = onBack !== undefined || router.canGoBack();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));

  return (
    <View style={[styles.appBar, { paddingTop: insets.top }, !borderless && styles.appBarBorder]}>
      <View style={styles.appBarSide}>
        {canGoBack ? <IconButton icon={ArrowLeft} accessibilityLabel={backLabel} onPress={back} /> : null}
      </View>
      <Text style={[type.subheading, styles.appBarTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.appBarSide, styles.appBarRight]}>{right}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

export function AppText({
  variant = 'body',
  color,
  children,
  style,
  ...rest
}: TextProps & { variant?: TypeToken; color?: string; children: ReactNode }) {
  const token = type[variant];
  const tabular = variant === 'bodyStrong' || variant === 'title' || variant === 'display';
  return (
    <Text
      {...rest}
      style={[token as TextStyle, tabular ? tabularNums : null, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.flex}>
        <AppText variant="subheading">{title}</AppText>
        {subtitle ? (
          <AppText variant="label" color={colors.textMuted} style={styles.sectionSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.6 }]}>
          <AppText variant="labelStrong" color={colors.accentText}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({
  label,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'primary' | 'sage' | 'success' | 'error' | 'gold';
}) {
  const tones = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    primary: { bg: colors.primarySoft, fg: colors.accentText },
    sage: { bg: colors.sageSoft, fg: colors.sage },
    success: { bg: colors.successSoft, fg: colors.success },
    error: { bg: colors.errorSoft, fg: colors.error },
    gold: { bg: colors.goldSoft, fg: '#7A5C22' },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}>
      {Icon ? <Icon size={12} color={tones.fg} strokeWidth={2} /> : null}
      <Text style={[type.labelStrong, { color: tones.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Icon + text pair for metadata (duration, level, lessons...). */
export function MetaItem({ icon: Icon, label, color = colors.textMuted }: { icon: LucideIcon; label: string; color?: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon size={13} color={color} strokeWidth={1.75} />
      <Text style={[type.label, tabularNums, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const press = usePressScale(0.985);
  const inactive = disabled || loading;

  const tones = {
    primary: { bg: colors.primary, fg: colors.onAccent, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.accentText, border: 'transparent' },
    danger: { bg: colors.errorSoft, fg: colors.error, border: 'transparent' },
  }[variant];

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, press.style, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={() => {
          feedback.tap();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: variant === 'primary' && pressed ? colors.primaryPressed : tones.bg,
            borderColor: tones.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            // Disabled stays legible: the label explains what is missing elsewhere on screen.
            opacity: inactive ? 0.55 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={tones.fg} size="small" />
        ) : (
          <>
            {Icon ? <Icon size={18} color={tones.fg} strokeWidth={1.9} /> : null}
            <Text style={[type.bodyStrong, { color: tones.fg }]} numberOfLines={1}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = layout.touchTarget,
  iconSize = 20,
  variant = 'plain',
  active = false,
  badge,
  style,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  variant?: 'plain' | 'soft' | 'onImage';
  active?: boolean;
  /** Unread count. Capped at 99+ so the badge shape stays stable. */
  badge?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const press = usePressScale(0.92);
  const bg = variant === 'soft' ? colors.surfaceAlt : variant === 'onImage' ? colors.scrim : 'transparent';
  const color = variant === 'onImage' ? colors.textInverse : active ? colors.accentText : colors.text;

  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          badge ? `${accessibilityLabel}, ${badge > 99 ? 'more than 99' : badge} unread` : accessibilityLabel
        }
        accessibilityState={{ selected: active }}
        hitSlop={8}
        onPress={() => {
          feedback.tap();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.iconButton,
          { width: size, height: size, backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
          style,
        ]}>
        <Icon size={iconSize} color={color} strokeWidth={1.75} />
        {badge && badge > 0 ? (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

type FormFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  prefix?: string;
  icon?: LucideIcon;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function FormField({
  label,
  error,
  hint,
  prefix,
  icon: Icon,
  rightSlot,
  containerStyle,
  style,
  ...rest
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? (
        <Text style={[type.labelStrong, { color: colors.textMuted }]} nativeID={`${rest.nativeID ?? 'field'}-label`}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor: error ? colors.error : focused ? colors.accentText : colors.border,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}>
        {Icon ? <Icon size={18} color={colors.textSubtle} strokeWidth={1.75} /> : null}
        {prefix ? <Text style={[type.body, tabularNums, { color: colors.text }]}>{prefix}</Text> : null}
        <TextInput
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, type.body, { color: colors.text }, style]}
        />
        {rightSlot}
      </View>
      {error ? (
        <View style={styles.fieldMessage} accessibilityLiveRegion="polite">
          <CircleAlert size={13} color={colors.error} strokeWidth={2} />
          <Text style={[type.label, { color: colors.error, flex: 1 }]}>{error}</Text>
        </View>
      ) : hint ? (
        <View style={styles.fieldMessage}>
          <Info size={13} color={colors.textSubtle} strokeWidth={2} />
          <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Filter chip: three states (default, selected, disabled). One scrolling row, clear-all always. */
export function Chip({
  label,
  icon: Icon,
  selected = false,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: LucideIcon;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const press = usePressScale(0.96);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => {
          feedback.select();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        {Icon ? <Icon size={14} color={selected ? colors.onAccent : colors.textMuted} strokeWidth={1.9} /> : null}
        <Text style={[type.label, { color: selected ? colors.onAccent : colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Segmented control (2-4 options). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => {
              feedback.select();
              onChange(option.id);
            }}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text
              style={[active ? type.labelStrong : type.label, { color: active ? colors.onAccent : colors.textMuted }]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const press = usePressScale(0.97);
  const reduced = useReducedMotion();
  const position = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.value = reduced ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 160 });
  }, [value, reduced, position]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * 20 }] }));

  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={[type.body, { color: colors.text }]}>{label}</Text>
        {help ? <Text style={[type.label, { color: colors.textMuted }]}>{help}</Text> : null}
      </View>
      <Animated.View style={press.style}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={help}
          accessibilityState={{ checked: value }}
          onPress={() => {
            feedback.select();
            onChange(!value);
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[styles.switchTrack, value ? styles.switchTrackOn : styles.switchTrackOff]}>
          <Animated.View style={[styles.switchKnob, knobStyle]} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Feedback & states
 * ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  height = 4,
  trackColor = colors.surfaceAlt,
  fillColor = colors.primary,
  accessibilityLabel,
}: {
  value: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  accessibilityLabel?: string;
}) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  // Numeric width from a measured track: avoids transform-origin edge cases across platforms.
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = reduced ? clamped : withTiming(clamped, { duration: 320 });
  }, [clamped, reduced, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: Math.round(progress.value * width) }));

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.progressTrack, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: fillColor, borderRadius: height / 2 }, fillStyle]} />
    </View>
  );
}

export function Skeleton({
  width = '100%',
  height = 12,
  borderRadius = radius.xs,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.5, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: reduced ? 1 : pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: colors.surfaceAlt }, style, animated]}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateBlock}>
      <View style={styles.stateIcon}>
        <Icon size={24} color={colors.accentText} strokeWidth={1.75} />
      </View>
      <Text style={[type.subheading, styles.centerText, { color: colors.text }]}>{title}</Text>
      <Text style={[type.body, styles.centerText, { color: colors.textMuted }]}>{body}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={styles.stateAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
  offline = false,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
  offline?: boolean;
}) {
  return (
    <View style={styles.stateBlock}>
      <View style={[styles.stateIcon, { backgroundColor: colors.errorSoft }]}>
        {offline ? (
          <WifiOff size={24} color={colors.error} strokeWidth={1.75} />
        ) : (
          <CircleAlert size={24} color={colors.error} strokeWidth={1.75} />
        )}
      </View>
      <Text style={[type.subheading, styles.centerText, { color: colors.text }]}>{title}</Text>
      <Text style={[type.body, styles.centerText, { color: colors.textMuted }]}>{body}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" fullWidth={false} style={styles.stateAction} /> : null}
    </View>
  );
}

/** Settings-style row: icon, label, optional value, chevron. Dividers come from DataList. */
export function ListRow({
  icon: Icon,
  label,
  value,
  subtitle,
  onPress,
  rightSlot,
  tone = 'default',
  chevron = true,
}: {
  icon?: LucideIcon;
  label: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  rightSlot?: ReactNode;
  tone?: 'default' | 'danger';
  chevron?: boolean;
}) {
  const content = (
    <>
      {Icon ? (
        <View style={styles.listRowIcon}>
          <Icon size={18} color={tone === 'danger' ? colors.error : colors.text} strokeWidth={1.75} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={[type.body, { color: tone === 'danger' ? colors.error : colors.text }]} numberOfLines={2}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[type.label, { color: colors.textMuted, marginTop: spacing.none }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[type.label, tabularNums, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {rightSlot}
      {onPress && chevron ? <ChevronRight size={18} color={colors.textSubtle} strokeWidth={1.75} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.listRow}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  );
}

/** Accordion: chevron rotates, content fades in, expansion is not animated on layout. */
export function Accordion({
  title,
  subtitle,
  children,
  right,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  const rotation = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(open ? 1 : 0, { duration: reduced ? 0 : 160 });
  }, [open, reduced, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 180}deg` }] }));

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          feedback.tap();
          setOpen((value) => !value);
        }}
        style={({ pressed }) => [styles.accordionHeader, pressed && { opacity: 0.7 }]}>
        <View style={styles.flex}>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[type.label, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {right}
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color={colors.textSubtle} strokeWidth={1.75} />
        </Animated.View>
      </Pressable>
      {open ? <Animated.View entering={FadeIn.duration(reduced ? 0 : 160)}>{children}</Animated.View> : null}
    </View>
  );
}

/** Bottom scrim for photography. Only used where native text sits over an image. */
export function Scrim({ from = 'transparent', to = colors.scrim, style }: { from?: string; to?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[StyleSheet.absoluteFill, style, styles.noTouch]}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Tab screens: identity + headers
 * ------------------------------------------------------------------ */

/** Initials avatar: one yellow tint, hairline ring, no photo needed for sample content. */
export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string | null }) {
  const initial = (name.trim().charAt(0) || 'R').toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={uri}
          style={{ width: size, height: size, borderRadius: radius.pill }}
          contentFit="cover"
          transition={160}
        />
      ) : (
        <Text style={{ fontFamily: font.semibold, fontSize: Math.round(size * 0.42), color: colors.accentText }}>{initial}</Text>
      )}
    </View>
  );
}

export function AvatarButton({
  name,
  onPress,
  accessibilityLabel,
  size = 40,
  uri,
}: {
  name: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  uri?: string | null;
}) {
  const press = usePressScale(0.94);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        onPress={() => {
          feedback.tap();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => (pressed ? styles.pressed : null)}>
        <Avatar name={name} size={size} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Header for a tab screen: safe area on top, 16px side padding, overline + one semibold line,
 * actions on the right. Used instead of repeating the tab name as a page title — the tab bar
 * already says where you are, so the header carries identity or progress instead.
 */
export function TabHeader({
  leading,
  overline,
  title,
  meta,
  actions,
  bordered = false,
  style,
}: {
  leading?: ReactNode;
  overline?: string;
  title?: string;
  meta?: string;
  actions?: ReactNode;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabHeader, { paddingTop: insets.top + spacing.sm }, bordered && styles.tabHeaderBorder, style]}>
      {leading}
      <View style={styles.flex}>
        {overline ? (
          <Text style={[type.overline, { color: colors.textSubtle }]} numberOfLines={1}>
            {overline}
          </Text>
        ) : null}
        {title ? (
          <Text style={[type.subheading, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[type.label, tabularNums, { color: colors.textMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.tabHeaderActions}>{actions}</View> : null}
    </View>
  );
}

/** Yellow tile that carries the brand mark in tab headers. */
export function BrandTile({ size = 40, children }: { size?: number; children: ReactNode }) {
  return <View style={[styles.brandTile, { width: size, height: size }]}>{children}</View>;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

export const SEARCH_PLACEHOLDER = 'Search courses, skills or a dish';

/** Pill search field. Focus raises the border and reveals a Cancel action, iOS style. */
export function SearchField({
  value,
  onChangeText,
  onSubmit,
  onFocusChange,
  onCancel,
  placeholder = SEARCH_PLACEHOLDER,
  autoFocus = false,
  style,
}: {
  value: string;
  onChangeText: (next: string) => void;
  onSubmit?: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);

  return (
    <View style={[styles.searchRow, style]}>
      <View style={[styles.search, focused && styles.searchFocused]}>
        <Search size={18} color={focused ? colors.accentText : colors.textSubtle} strokeWidth={1.9} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={() => onSubmit?.(value)}
          onFocus={() => {
            setFocused(true);
            onFocusChange?.(true);
          }}
          onBlur={() => {
            setFocused(false);
            onFocusChange?.(false);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          returnKeyType="search"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel={placeholder}
          style={[type.body, styles.searchInput, { color: colors.text }]}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={() => {
              onChangeText('');
              input.current?.focus();
            }}
            style={({ pressed }) => [styles.searchClear, pressed && styles.pressed]}>
            <X size={15} color={colors.textMuted} strokeWidth={2.1} />
          </Pressable>
        ) : null}
      </View>
      {focused ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
          hitSlop={8}
          onPress={() => {
            onChangeText('');
            input.current?.blur();
            onCancel?.();
          }}
          style={({ pressed }) => (pressed ? styles.pressed : null)}>
          <Text style={[type.labelStrong, { color: colors.accentText }]}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  centerText: { textAlign: 'center' },
  scrollContent: {
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  rail: { paddingHorizontal: layout.screen, gap: layout.gap },
  list: { paddingHorizontal: layout.screen },
  listDivider: { height: 1, backgroundColor: colors.divider },

  divider: { height: 1, backgroundColor: colors.divider },
  noTouch: { pointerEvents: 'none' },
  boxNone: { pointerEvents: 'box-none' },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screen,
  },
  appBarBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  appBarSide: { width: layout.touchTarget, alignItems: 'flex-start' },
  appBarRight: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, width: 'auto', minWidth: layout.touchTarget },
  appBarTitle: { flex: 1, textAlign: 'center' },

  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.headerHeight,
    paddingHorizontal: layout.section,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  tabHeaderBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  tabHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  avatar: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTile: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.fieldHeight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
  },
  searchFocused: { borderColor: colors.accentText, backgroundColor: colors.surface },
  searchInput: { flex: 1, paddingVertical: spacing.sm },
  searchClear: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: layout.screen },
  sectionSubtitle: { marginTop: 2 },
  sectionAction: { paddingBottom: 2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },

  button: {
    minHeight: layout.buttonHeight,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.edge,
  },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeDotText: { fontFamily: font.semibold, fontSize: 10, lineHeight: 12, color: colors.surface },

  fieldWrap: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.fieldHeight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  fieldMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
    marginHorizontal: layout.screen,
  },
  segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
  segmentActive: { backgroundColor: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: layout.touchTarget },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  switchTrackOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  progressTrack: { width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },

  stateBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: layout.section },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateAction: { marginTop: spacing.sm },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  listRowIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: layout.touchTarget,
    paddingHorizontal: layout.screen,
  },
});
