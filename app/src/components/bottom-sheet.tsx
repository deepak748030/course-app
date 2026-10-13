/**
 * Bottom sheet for filters, lesson lists, paywalls and confirmations.
 * Rules honoured: docked sheet has rounded top corners and square bottom corners;
 * backdrop dims the page; spring entrance; reduced-motion falls back to a fade.
 */
import { useT } from '@/i18n';

import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scrollable = false,
  footer,
  dark = false,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
  footer?: ReactNode;
  /** Black, frosted-glass sheet for the video player. Text on it must be the light ink the caller picks. */
  dark?: boolean;
}) {
  const t = useT();

  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(1);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = reduced ? 0 : withSpring(0, { damping: 24, stiffness: 260, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 160 });
      return;
    }

    // Closing. The sheet must stay mounted until the exit animation has played, but React
    // state can only be touched from the JS thread: a callback passed to withTiming runs as a
    // worklet on the UI runtime, where calling setState throws
    // "[Worklets] Tried to synchronously call a Remote Function … dispatchSetState".
    // So the unmount is scheduled with a plain timer that matches the animation duration.
    backdrop.value = withTiming(0, { duration: 160 });
    translateY.value = reduced ? 1 : withTiming(1, { duration: 200 });

    const timer = setTimeout(() => setMounted(false), reduced ? 0 : 220);
    return () => clearTimeout(timer);
  }, [visible, reduced, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value * 560 }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.4 }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal accessibilityLabel={title}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Pressable accessibilityRole="button" accessibilityLabel={t("Close")} style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, dark && styles.sheetDark, { paddingBottom: insets.bottom + spacing.md }, sheetStyle]}>
          {dark ? <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[styles.grabber, dark && styles.grabberDark]} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="subheading" color={dark ? colors.onPlayer : undefined}>{title}</AppText>
                {subtitle ? (
                  <Text style={[type.label, { color: dark ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{subtitle}</Text>
                ) : null}
              </View>
              <IconButton
                icon={X}
                onPress={onClose}
                accessibilityLabel={t("Close")}
                variant={dark ? 'onImage' : 'soft'}
                size={36}
                iconSize={18}
              />
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title} subtitle={body}>
      <View style={styles.confirmActions}>
        <Button label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} />
        <Button label={cancelLabel} onPress={onCancel} variant="ghost" />
      </View>
    </BottomSheet>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.player },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: layout.section,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  sheetDark: { backgroundColor: 'rgba(0,0,0,0.62)', overflow: 'hidden' },
  grabberDark: { backgroundColor: 'rgba(255,255,255,0.35)' },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  headerText: { flex: 1, gap: 2 },
  body: { gap: spacing.md },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.sm },
  footer: { paddingTop: spacing.sm },
  confirmActions: { gap: spacing.sm },
}));
