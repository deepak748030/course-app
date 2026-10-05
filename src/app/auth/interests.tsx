import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, PrimaryButton, ScreenContainer } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { interests } from '@/data/catalog';
import { useStore } from '@/store';

/**
 * Optional preference step. Selections reorder Home recommendations; skipping is a
 * first-class action, so nothing is gated behind a choice.
 */
export default function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isInterestSelected, toggleInterest, state } = useStore();

  const selectedCount = useMemo(
    () => interests.filter((interest) => state.interests.includes(interest.id)).length,
    [state.interests],
  );

  const finish = () => router.replace('/home');

  return (
    <View style={styles.root}>
      <ScreenContainer
        edges={['top']}
        contentStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}>
        <Text style={[type.screenTitle, { color: colors.text }]}>What would you like to cook?</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          Pick a few and we will put those courses first on your home screen. You can change this anytime.
        </Text>

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
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            {selectedCount === 0 ? 'No preferences selected yet — that is fine.' : `${selectedCount} selected`}
          </Text>
          <PrimaryButton label="Start learning" onPress={finish} />
          <PrimaryButton label="Maybe later" onPress={finish} variant="ghost" />
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { gap: spacing.xs, marginTop: spacing.md },
});
