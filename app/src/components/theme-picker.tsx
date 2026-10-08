/**
 * The theme switcher that lives on Profile.
 *
 * A radio list, one row per theme — the same shape as the language picker on its own screen, so the
 * two appearance controls read as one family. Each row carries a two-tone swatch of the theme it
 * picks (the accent and its soft tint), the name, a one-line description, and the radio.
 *
 * An earlier version drew a miniature screen per theme in a two-up tile. It looked busy at this size
 * and the preview art competed with the copy, so the swatch carries the colour and the words carry
 * the meaning.
 *
 * Accessibility: a radio group, each row a radio with a checked state, its label and its description
 * as the hint, and a 56pt row — comfortably past the 44pt target.
 */
import { useT } from '@/i18n';

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
  const t = useT();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('App theme')}>
      {THEMES.map((theme, index) => (
        <View key={theme.id}>
          {/* Hairline between the rows, inset past the swatch — the same treatment as every other
              list in the app. */}
          {index > 0 ? <View style={styles.rule} /> : null}
          <ThemeOption
            id={theme.id}
            label={t(theme.label)}
            description={t(theme.description)}
            selected={value === theme.id}
            onSelect={() => onChange(theme.id)}
          />
        </View>
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
  const press = usePressScale(0.985);
  const palette = paletteFor(id);

  return (
    <Animated.View style={press.style}>
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
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {/* The swatch: this theme's accent, next to the tint that accents the surfaces. */}
        <View style={styles.swatch} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.swatchTop, { backgroundColor: palette.primary }]} />
          <View style={[styles.swatchBottom, { backgroundColor: palette.surfaceAlt, borderColor: palette.divider }]} />
        </View>

        <View style={styles.text}>
          <Text style={[type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={2}>
            {description}
          </Text>
        </View>

        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <Check size={12} color={colors.onAccent} strokeWidth={3} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  rule: { height: 1, backgroundColor: colors.divider, marginLeft: 52 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchTop: { height: 22 },
  swatchBottom: { flex: 1, borderTopWidth: 1 },
  text: { flex: 1, gap: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.accentText, borderColor: colors.accentText },
}));
