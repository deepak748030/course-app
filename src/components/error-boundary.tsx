import { CircleAlert, RotateCcw } from 'lucide-react-native';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * Last line of defence. A render error in any screen used to surface as a blank page (or a
 * red box in development) with no way forward; this shows what happened, in the app's own
 * language, and offers a retry that re-mounts the tree.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in on purpose: this is a prototype, and the console is the only log a reviewer has.
    console.error('[YDU Academy] render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.icon}>
            <CircleAlert size={26} color={colors.error} strokeWidth={1.8} />
          </View>
          <Text style={[type.title, styles.center, { color: colors.text }]}>{t("Something broke on this screen")}</Text>
          <Text style={[type.body, styles.center, { color: colors.textMuted }]}>
            The rest of the app is still usable. Try again, and if it keeps happening open a different tab and come
            back.
          </Text>

          <View style={styles.detail}>
            <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("What the app reported")}</Text>
            <Text style={[type.label, { color: colors.text }]}>{error.message || String(error)}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Try this screen again")}
            onPress={() => this.setState({ error: null })}
            style={({ pressed }) => [styles.retry, pressed && { opacity: 0.75 }]}>
            <RotateCcw size={16} color={colors.text} strokeWidth={1.9} />
            <Text style={[type.bodyStrong, { color: colors.text }]}>{t("Try again")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.section, paddingVertical: spacing.xxxl, gap: spacing.md, alignItems: 'center' },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  detail: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    paddingHorizontal: layout.edge,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
}));
