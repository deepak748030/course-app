/**
 * The language switcher that lives on Profile, next to the theme picker.
 *
 * Two tabs — English and हिंदी — and under them a live line of copy in the chosen language, so the
 * choice is visible before you leave the screen. Selecting one changes the whole interface immediately
 * and writes the choice to the device.
 *
 * Accessibility: the pair is a radio group, each tab is a radio with a checked state, and the visible
 * label is the language's own name (never a translation of it).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createStyles, colors, radius, spacing, type } from '@/constants/theme';
import { LANGUAGES, useT, type Language } from '@/i18n';
import { feedback } from '@/lib/util';

export function LanguagePicker({
  value,
  onChange,
}: {
  value: Language;
  onChange: (id: Language) => void;
}) {
  const t = useT();
  const selected = LANGUAGES.find((language) => language.id === value) ?? LANGUAGES[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="radiogroup" accessibilityLabel={t("App language")}>
        {LANGUAGES.map((language) => {
          const active = language.id === value;
          return (
            <Pressable
              key={language.id}
              accessibilityRole="radio"
              accessibilityLabel={language.label}
              accessibilityHint={language.description}
              accessibilityState={{ checked: active }}
              // react-native-web does not project accessibilityState onto the DOM, so the state is
              // also given as an ARIA attribute for the web build.
              aria-checked={active}
              onPress={() => {
                feedback.select();
                onChange(language.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && { opacity: 0.8 },
              ]}>
              <Text
                style={[
                  active ? type.labelStrong : type.label,
                  { color: active ? colors.onAccent : colors.textMuted },
                ]}>
                {language.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[type.labelStrong, styles.sample, { color: colors.accentText }]}>{selected.sample}</Text>
      <Text style={[type.label, { color: colors.textMuted }]}>{selected.description}</Text>
    </View>
  );
}

const styles = createStyles(() => StyleSheet.create({
  wrap: { gap: spacing.xs },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.accentText },
  sample: { marginTop: spacing.xs },
}));
