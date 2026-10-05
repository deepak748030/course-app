import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, Badge, Divider, Screen, Segmented } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { legalDocs } from '@/data/content';

type DocKey = keyof typeof legalDocs;

const DOC_TABS: { id: DocKey; label: string }[] = [
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'refund', label: 'Refunds' },
];

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();

  const key: DocKey = doc === 'privacy' || doc === 'refund' ? doc : 'terms';
  const document = legalDocs[key];

  return (
    <Screen header={<AppBar title={document.title} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      <View style={styles.header}>
        <Text style={[type.title, { color: colors.text }]}>{document.title}</Text>
        <Badge label={document.updated} tone="gold" />
      </View>

      <View style={styles.pad}>
        <Segmented options={DOC_TABS} value={key} onChange={(next) => router.setParams({ doc: next })} />
      </View>

      <View style={styles.pad}>
        <Text style={[type.label, { color: colors.textSubtle }]}>
          Before distributing YDU Academy, replace this placeholder with documents reviewed by a lawyer.
        </Text>
      </View>

      <View style={styles.paragraphs}>
        {document.paragraphs.map((paragraph, index) => (
          <View key={index}>
            {index > 0 ? <Divider style={styles.divider} /> : null}
            <Text style={[type.body, styles.paragraph, { color: colors.text }]}>{paragraph}</Text>
          </View>
        ))}
      </View>

    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  pad: { paddingHorizontal: layout.screen },
  header: { gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: layout.section, paddingTop: spacing.sm },
  paragraphs: { paddingHorizontal: layout.screen },
  paragraph: { paddingVertical: spacing.md },
  divider: { marginLeft: 0 },
}));
