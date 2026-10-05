/**
 * The theme switcher that lives on Profile.
 *
 * Two options, each one a live miniature of the theme it picks: the accent fill, the tinted block
 * and the two text tones. Selecting one applies it to the whole app immediately.
 *
 * Accessibility: the pair is a radio group, each option is a radio with a checked state, a label
 * and the description as its hint; both options clear the 44pt touch target by a wide margin.
 */

import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/ui';
import {
  createStyles,
  colors,
  paletteFor,
  radius,
  spacing,
  type,
  THEMES,
  type ThemeId,
} from '@/constants/theme';
import { feedback } from '@/lib/util';

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="App theme">
      {THEMES.map((theme) => (
        <ThemeOption
          key={theme.id}
          id={theme.id}
          label={theme.label}
          description={theme.description}
          selected={value === theme.id}
          onSelect={() => onChange(theme.id)}
        />
      ))}
    </View>
  );
}

function ThemeOption({
  id,
  label,
  description,
  selected,
  onSelect,
}: {
  id: ThemeId;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const press = usePressScale(0.97);

  return (
    <Animated.View style={[styles.optionWrap, press.style]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`${label} theme`}
        accessibilityHint={description}
        accessibilityState={{ checked: selected }}
        // `accessibilityState` is what native reads; react-native-web does not project it onto the
        // DOM, so the checked state is also given as an ARIA attribute for the web build.
        aria-checked={selected}
        onPress={() => {
          feedback.select();
          onSelect();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.option,
          selected && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}>
        <ThemePreview id={id} />

        <View style={styles.labelRow}>
          <Text style={[type.labelStrong, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected ? <Check size={11} color={colors.onAccent} strokeWidth={3} /> : null}
          </View>
        </View>

        <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A miniature of the theme: the tinted block (surfaceAlt) holds the accent fill and the two text
 * tones, so the difference between the two options is visible without applying either one.
 */
function ThemePreview({ id }: { id: ThemeId }) {
  const palette = paletteFor(id);

  return (
    <View style={[styles.preview, { backgroundColor: palette.surfaceAlt, borderColor: palette.divider }]}>
      <View style={styles.previewTop}>
        <View style={[styles.previewDot, { backgroundColor: palette.primary }]} />
        <View style={[styles.previewPill, { backgroundColor: palette.primary }]} />
      </View>
      <View style={[styles.previewLine, { backgroundColor: palette.text, width: '76%' }]} />
      <View style={[styles.previewLine, { backgroundColor: palette.textMuted, width: '52%', opacity: 0.55 }]} />
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  optionWrap: { flex: 1 },
  option: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderWidth: 1.5, borderColor: colors.accentText },
  optionPressed: { opacity: 0.85 },
  preview: {
    height: 62,
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  previewDot: { width: 12, height: 12, borderRadius: radius.pill },
  previewPill: { width: 30, height: 12, borderRadius: radius.pill },
  previewLine: { height: 6, borderRadius: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  check: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accentText, borderColor: colors.accentText },
}));
