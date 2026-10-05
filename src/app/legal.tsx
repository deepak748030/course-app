import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, Badge, Button, Divider, Screen } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { legalDocs } from '@/data/content';

type DocKey = keyof typeof legalDocs;

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();

  const key: DocKey = doc === 'privacy' ? 'privacy' : 'terms';
  const document = legalDocs[key];

  return (
    <Screen header={<AppBar title={document.title} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      <View style={styles.header}>
        <Text style={[type.title, { color: colors.text }]}>{document.title}</Text>
        <Badge label={document.updated} tone="gold" />
      </View>

      <View style={styles.pad}>
        <Text style={[type.label, { color: colors.textSubtle }]}>
          Before distributing Rasoi Studio, replace this placeholder with documents reviewed by a lawyer.
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

      <View style={styles.pad}>
        <Button
          label={key === 'terms' ? 'Read the privacy policy' : 'Read the terms of use'}
          variant="secondary"
          onPress={() => router.replace({ pathname: '/legal', params: { doc: key === 'terms' ? 'privacy' : 'terms' } })}
        />
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
