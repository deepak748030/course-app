import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, PrimaryButton, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { legalDocs } from '@/data/content';

type DocKey = keyof typeof legalDocs;

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const key: DocKey = doc === 'privacy' ? 'privacy' : 'terms';
  const document = legalDocs[key];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={document.title} />

        <View style={styles.header}>
          <Text style={[type.screenTitle, { color: colors.text, fontSize: 25, lineHeight: 32 }]}>
            {document.title}
          </Text>
          <Badge label={document.updated} tone="gold" />
        </View>

        <View style={styles.card}>
          {document.paragraphs.map((paragraph, index) => (
            <Text key={index} style={[type.body, { color: colors.textSecondary }]}>
              {paragraph}
            </Text>
          ))}
        </View>

        <AppText variant="meta" color={colors.textSecondary}>
          Before distributing Rasoi Studio, replace this placeholder with documents reviewed by a lawyer.
        </AppText>

        <PrimaryButton
          label="Other document"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/legal', params: { doc: key === 'terms' ? 'privacy' : 'terms' } })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: spacing.xs, alignItems: 'flex-start' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
});
