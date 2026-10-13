/**
 * Language: the screen Profile opens when you tap the Language row.
 *
 * One row per language — its own name, what it covers, and a radio mark on the right — because a readable
 * list is clearer than two tabs squeezed into a card. Choosing one applies to the whole interface on the
 * spot and is stored with the theme, so it is still there after a restart; the preview underneath shows
 * the change in the chosen language before you leave the screen.
 *
 * The names are never translated: a language is listed the way its own speakers write it.
 */

import { StyleSheet, Pressable, Text, View } from 'react-native';

import { AppBar, Divider, Screen, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { LANGUAGES, useT } from '@/i18n';
import { feedback } from '@/lib/util';
import { useStore } from '@/store';

export default function LanguageScreen() {
  const t = useT();

  const { state, setLanguage } = useStore();
  const selected = LANGUAGES.find((language) => language.id === state.language) ?? LANGUAGES[0];

  return (
    <Screen
      header={<AppBar title={t('App language')} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      <View style={styles.intro}>
        <Text style={[type.body, { color: colors.text }]}>
          {t('Switches the whole interface right away, and is remembered on this device.')}
        </Text>
      </View>

      <View style={styles.pad}>
        <View style={styles.card}>
          {LANGUAGES.map((language, index) => {
            const active = language.id === state.language;
            return (
              <View key={language.id}>
                {index > 0 ? <Divider inset={layout.section} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={language.label}
                  accessibilityHint={t(language.description)}
                  accessibilityState={{ checked: active }}
                  // react-native-web does not project accessibilityState onto the DOM, so the checked
                  // state is also given as an ARIA attribute for the web build.
                  aria-checked={active}
                  onPress={() => {
                    feedback.select();
                    setLanguage(language.id);
                  }}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                  <View style={styles.flex}>
                    <Text style={[type.body, { color: colors.text }]}>{language.label}</Text>
                    <Text style={[type.label, { color: colors.textMuted }]}>{t(language.description)}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioSelected]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.pad}>
        <SectionHeader title={t('Preview')} subtitle={t('A line from the interface, in the language you pick')} />
        <View style={styles.preview}>
          <Text style={[type.bodyStrong, { color: colors.accentText }]}>{selected.sample}</Text>
        </View>
      </View>

      <View style={styles.pad}>
        <Text style={[type.label, { color: colors.textSubtle }]}>
          {t('Course titles and lesson copy stay in English.')}
        </Text>
      </View>

    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  pad: { paddingHorizontal: layout.screen, gap: layout.gap },
  intro: { gap: spacing.xs, paddingHorizontal: layout.section, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchTarget,
    paddingHorizontal: layout.section,
    paddingVertical: spacing.md,
  },
  flex: { flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accentText },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.accentText },
  preview: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
}));
