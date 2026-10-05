/**
 * Bottom sheet used for filters, lesson lists, paywalls and confirmations.
 * Native Modal + Reanimated spring; backdrop tap and Android back both dismiss.
 */

import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, PrimaryButton, AppText } from '@/components/ui';
import { colors, radius, screenPadding, spacing, type } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
  footer?: ReactNode;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scrollable = false,
  footer,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(1);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = reduced ? 0 : withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 200 });
      return;
    }
    backdrop.value = withTiming(0, { duration: 180 });
    if (reduced) {
      translateY.value = 1;
      setMounted(false);
      return;
    }
    translateY.value = withTiming(1, { duration: 220 }, (finished) => {
      if (finished) setMounted(false);
    });
  }, [visible, reduced, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value * 520 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.45 }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal accessibilityLabel={title}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }, sheetStyle]}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="cardTitle">{title}</AppText>
                {subtitle ? <Text style={[type.supporting, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
              </View>
              <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" variant="soft" size={40} />
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
        <PrimaryButton label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} />
        <PrimaryButton label={cancelLabel} onPress={onCancel} variant="ghost" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.player },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  body: { gap: spacing.md },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.md },
  footer: { paddingTop: spacing.sm },
  confirmActions: { gap: spacing.xs },
});
