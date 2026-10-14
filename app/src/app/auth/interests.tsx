import { useRouter } from '@/lib/router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Screen } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useCatalog } from '@/services/catalog-context';
import { useT } from '@/i18n';
import { useStore } from '@/store';

/**
 * Optional preference step. Selections reorder Home recommendations; skipping is a
 * first-class action, so nothing is gated behind a choice.
 */
export default function InterestsScreen() {
  const { categories } = useCatalog();
  const interests = categories;
  const t = useT();

  const router = useRouter();
  const { isInterestSelected, toggleInterest, state } = useStore();

  const selectedCount = useMemo(
    () => interests.filter((interest) => state.interests.includes(interest.id)).length,
    [state.interests],
  );

  const finish = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Screen contentStyle={{ paddingBottom: spacing.md }}>
        <View style={styles.intro}>
          <Text style={[type.title, { color: colors.text }]}>{t('What do you work with?')}</Text>
          <Text style={[type.body, { color: colors.textMuted }]}>
            {t("Pick a few tracks and we will put those courses first on your home screen. You can change this anytime in Settings.")}
          </Text>
        </View>

        <View style={styles.chips}>
          {interests.map((interest) => (
            <Chip
              key={interest.id}
              label={interest.label}
              selected={isInterestSelected(interest.id)}
              onPress={() => toggleInterest(interest.id)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[type.label, { color: colors.textMuted }]}>
            {selectedCount === 0 ? 'Nothing selected yet — that is fine.' : `${selectedCount} selected`}
          </Text>
          <Button label={t("Start learning")} onPress={finish} />
          <Button label={t("Maybe later")} onPress={finish} variant="ghost" />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = createStyles(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  intro: { gap: spacing.sm, paddingHorizontal: layout.section, paddingTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gap, paddingHorizontal: layout.screen, paddingTop: spacing.lg },
  footer: { gap: spacing.sm, paddingHorizontal: layout.screen, paddingTop: spacing.xl },
}));
