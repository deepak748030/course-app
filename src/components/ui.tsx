/**
 * Core UI kit: text, layout, buttons, fields, chips, feedback states.
 * Every visual value comes from @/constants/theme — no ad-hoc colors or spacing.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ArrowLeft, ChevronDown, CircleAlert, Lock, Star, WifiOff } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, font, maxContentWidth, radius, screenPadding, spacing, touchTarget, type } from '@/constants/theme';
import { feedback } from '@/lib/util';

/* ------------------------------------------------------------------ *
 * Motion helpers
 * ------------------------------------------------------------------ */

/** Card/button press: quick 0.98 compression, skipped when reduced motion is on. */
export function usePressScale(scaleTo = 0.98) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    style,
    onPressIn: () => {
      if (reduced) return;
      scale.value = withSpring(scaleTo, { damping: 20, stiffness: 340, mass: 0.6 });
    },
    onPressOut: () => {
      if (reduced) return;
      scale.value = withSpring(1, { damping: 18, stiffness: 280, mass: 0.6 });
    },
  };
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

type ScreenContainerProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
};

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  style,
  contentStyle,
  footer,
}: ScreenContainerProps) {
  const padding = padded ? { paddingHorizontal: screenPadding } : null;
  const inner = (
    <>
      {children}
      {footer}
    </>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentStyle]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function Badge({
  label,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'primary' | 'sage' | 'gold' | 'success' | 'error';
}) {
  const tones = {
    neutral: { bg: colors.surfaceWarm, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    sage: { bg: colors.sageSoft, fg: colors.sage },
    gold: { bg: colors.goldSoft, fg: '#7A5C22' },
    success: { bg: colors.successSoft, fg: colors.success },
    error: { bg: colors.errorSoft, fg: colors.error },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}>
      {Icon ? <Icon size={12} color={tones.fg} strokeWidth={2} /> : null}
      <Text style={[styles.badgeText, { color: tones.fg }]}>{label}</Text>
    </View>
  );
}

/** Small icon + label pair used for course metadata. */
export function MetaItem({
  icon: Icon,
  label,
  color = colors.textSecondary,
}: {
  icon: LucideIcon;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Icon size={14} color={color} strokeWidth={1.9} />
      <Text style={[type.meta, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

type AppTextVariant = keyof typeof type | 'title';

export function AppText({
  variant = 'body',
  color = colors.text,
  children,
  style,
  ...rest
}: TextProps & { variant?: AppTextVariant; color?: string; children: ReactNode }) {
  const variantStyle = variant === 'title' ? { fontFamily: font.serifSemibold, fontSize: 26, lineHeight: 33 } : type[variant];
  return (
    <Text {...rest} style={[variantStyle as TextStyle, { color }, style]}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: PrimaryButtonProps) {
  const press = usePressScale(0.985);
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.textInverse, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
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
            backgroundColor: variant === 'primary' && pressed ? colors.primaryPressed : palette.bg,
            borderColor: palette.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            opacity: inactive ? 0.5 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          <>
            {Icon ? <Icon size={18} color={palette.fg} strokeWidth={2} /> : null}
            <Text style={[type.button, { color: palette.fg }]} numberOfLines={1}>
              {label}
            </Text>
            {IconRight ? <IconRight size={18} color={palette.fg} strokeWidth={2} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

type IconButtonProps = {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  variant?: 'plain' | 'soft' | 'onImage';
  active?: boolean;
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = touchTarget,
  iconSize = 21,
  variant = 'plain',
  active = false,
  showBadge = false,
  style,
}: IconButtonProps) {
  const press = usePressScale(0.92);
  const bg = variant === 'soft' ? colors.surfaceWarm : variant === 'onImage' ? 'rgba(18,20,18,0.55)' : 'transparent';
  const color = variant === 'onImage' ? colors.onPlayer : active ? colors.primary : colors.text;

  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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
          { width: size, height: size, backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
          style,
        ]}>
        <Icon size={iconSize} color={color} strokeWidth={1.9} fill={active ? colors.primary : 'none'} />
        {showBadge ? <View style={styles.iconBadge} /> : null}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Form pieces
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
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? (
        <Text style={[type.label, { color: colors.textSecondary }]} nativeID={`${rest.nativeID ?? 'field'}-label`}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface },
        ]}>
        {Icon ? <Icon size={19} color={colors.textSecondary} strokeWidth={1.9} /> : null}
        {prefix ? <Text style={[type.body, styles.fieldPrefix, { color: colors.text }]}>{prefix}</Text> : null}
        <TextInput
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, type.body, { color: colors.text }, style]}
        />
        {rightSlot}
      </View>
      {error ? (
        <View style={styles.fieldMessage} accessibilityLiveRegion="polite">
          <CircleAlert size={14} color={colors.error} strokeWidth={2} />
          <Text style={[type.supporting, { color: colors.error, flex: 1 }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[type.supporting, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

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
        {Icon ? <Icon size={15} color={selected ? colors.textInverse : colors.textSecondary} strokeWidth={1.9} /> : null}
        <Text style={[type.label, { color: selected ? colors.textInverse : colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Sections & feedback
 * ------------------------------------------------------------------ */

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text style={[type.section, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.supporting, { color: colors.textSecondary, marginTop: spacing.xxs / 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8}>
          <Text style={[type.label, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  height = 6,
  trackColor = colors.surfaceWarm,
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
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = reduced ? clamped : withTiming(clamped, { duration: 320 });
  }, [clamped, reduced, progress]);

  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.0001, progress.value) }] }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.progressTrack, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: fillColor, borderRadius: height / 2, transformOrigin: 'left' },
          fill,
        ]}
      />
    </View>
  );
}

export function RatingSummary({
  rating,
  reviewCount,
  size = 13,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
}) {
  return (
    <View style={styles.ratingRow}>
      <Star size={size} color={colors.gold} strokeWidth={2} fill={colors.gold} />
      <Text style={[type.meta, { color: colors.text }]}>{rating.toFixed(1)}</Text>
      {reviewCount !== undefined ? (
        <Text style={[type.meta, { color: colors.textSecondary }]}>({reviewCount.toLocaleString('en-IN')})</Text>
      ) : null}
    </View>
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
        <Icon size={26} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={[type.cardTitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.supporting, { color: colors.textSecondary, textAlign: 'center' }]}>{body}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          fullWidth={false}
          style={styles.stateAction}
        />
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
        {offline ? <WifiOff size={26} color={colors.error} strokeWidth={1.8} /> : <CircleAlert size={26} color={colors.error} strokeWidth={1.8} />}
      </View>
      <Text style={[type.cardTitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.supporting, { color: colors.textSecondary, textAlign: 'center' }]}>{body}</Text>
      {onRetry ? (
        <PrimaryButton label="Try again" onPress={onRetry} variant="secondary" fullWidth={false} style={styles.stateAction} />
      ) : null}
    </View>
  );
}

/** Shimmer placeholder. Only render while data is genuinely loading. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 10,
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
    pulse.value = withRepeat(withTiming(0.55, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: reduced ? 1 : pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: colors.surfaceWarm }, style, animated]}
    />
  );
}

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
          <Icon size={19} color={tone === 'danger' ? colors.error : colors.text} strokeWidth={1.9} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={[type.body, { color: tone === 'danger' ? colors.error : colors.text }]}>{label}</Text>
        {subtitle ? <Text style={[type.supporting, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[type.supporting, { color: colors.textSecondary }]}>{value}</Text> : null}
      {rightSlot}
      {onPress && chevron ? <Text style={[type.meta, { color: colors.textSecondary }]}>›</Text> : null}
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

export function LockedNotice({ label = 'Included with the course' }: { label?: string }) {
  return (
    <View style={styles.lockedNotice}>
      <Lock size={14} color={colors.textSecondary} strokeWidth={2} />
      <Text style={[type.meta, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Scrim used over photography so native text stays readable. */
export function Scrim({ style, intensity = 0.55 }: { style?: StyleProp<ViewStyle>; intensity?: number }) {
  return (
    <LinearGradient
      colors={[`rgba(18,20,18,0)`, `rgba(18,20,18,${intensity})`]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  scrollContent: { paddingBottom: spacing.xxl, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  badgeText: { ...type.meta, letterSpacing: 0.2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs / 2, flexShrink: 1 },
  button: {
    minHeight: 52,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  iconBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  fieldWrap: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  fieldPrefix: { color: colors.textSecondary },
  input: { flex: 1, paddingVertical: spacing.sm },
  fieldMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingRight: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressTrack: { width: '100%', overflow: 'hidden' },
  progressFill: { ...StyleSheet.absoluteFill, width: '100%' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  stateBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.md },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateAction: { marginTop: spacing.xs },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget + 8,
    paddingVertical: spacing.sm,
  },
  listRowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingVertical: spacing.xxs,
  },
  accordion: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: touchTarget,
  },
  accordionBody: { paddingBottom: spacing.md, gap: spacing.xs },
});

/* ------------------------------------------------------------------ *
 * Navigation header and accordion
 * ------------------------------------------------------------------ */

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));

  return (
    <View style={styles.screenHeader}>
      <IconButton icon={ArrowLeft} accessibilityLabel="Go back" onPress={back} />
      {title ? (
        <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      {right}
    </View>
  );
}

/** Expansion is animated on the chevron only; content fades in, so no layout thrash. */
export function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  const rotation = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(open ? 1 : 0, { duration: reduced ? 0 : 200 });
  }, [open, reduced, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 180}deg` }] }));

  return (
    <View style={styles.accordion}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          feedback.tap();
          setOpen((value) => !value);
        }}
        style={({ pressed }) => [styles.accordionHeader, pressed && { opacity: 0.75 }]}>
        <View style={styles.flex}>
          <Text style={[type.label, { color: colors.text, fontFamily: type.body.fontFamily, fontSize: 15.5 }]}>
            {title}
          </Text>
          {subtitle ? <Text style={[type.meta, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {right}
        <Animated.View style={chevronStyle}>
          <ChevronDown size={19} color={colors.textSecondary} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(reduced ? 0 : 180)} style={styles.accordionBody}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
