/**
 * One policy document per screen — no tab strip in here.
 *
 * Terms, Privacy and Refunds are three separate destinations that Profile links to, so this screen can
 * read like the rest of the app instead of a document viewer: an app bar carrying the document's name,
 * a title block, an honest callout about what the copy is, and the text itself in headed cards so it
 * can be scanned rather than scrolled through.
 *
 * The document copy stays in English on purpose — it is placeholder material a lawyer has to replace,
 * and the note at the foot of the screen says so in whichever language the interface is in.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { LifeBuoy, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, DataList, ListRow, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { legalDocs } from '@/data/content';
import { useT } from '@/i18n';

type DocKey = keyof typeof legalDocs;

export default function LegalScreen() {
  const t = useT();

  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();

  const key: DocKey = doc === 'privacy' || doc === 'refund' ? doc : 'terms';
  const document = legalDocs[key];

  return (
    <Screen
      header={<AppBar title={t(document.title)} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {/* Title block: which document this is, what it covers, and how final it is. */}
      <View style={styles.intro}>
        <Text style={[type.overline, { color: colors.textSubtle }]}>{t('Sample document')}</Text>
        <Text style={[type.title, { color: colors.text }]}>{t(document.title)}</Text>
        <Text style={[type.body, { color: colors.textMuted }]}>{t(document.summary)}</Text>
      </View>

      {/* The warning that matters is the one a reader can see before the text, not small print at the
          bottom. */}
      <View style={styles.pad}>
        <View style={styles.callout}>
          <TriangleAlert size={18} color={colors.text} strokeWidth={1.9} />
          <Text style={[type.body, styles.calloutText, { color: colors.text }]}>
            {t(
              'Before distributing YDU Academy, replace this placeholder with documents reviewed by a lawyer.',
            )}
          </Text>
        </View>
      </View>

      {document.sections.map((section) => (
        <View key={section.heading} style={styles.pad}>
          <View style={styles.card}>
            <Text style={[type.subheading, { color: colors.text }]}>{section.heading}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={[type.body, { color: colors.textMuted }]}>
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.pad}>
        <Text style={[type.label, { color: colors.textSubtle }]}>
          {t(
            'Course titles, lesson copy and the policy documents are sample content and stay in English.',
          )}
        </Text>
      </View>

      <View style={styles.pad}>
        <DataList>
          <ListRow
            icon={LifeBuoy}
            label={t('Help and support')}
            subtitle={t('Answers and how to reach us')}
            onPress={() => router.push('/help')}
          />
        </DataList>
      </View>
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  pad: { paddingHorizontal: layout.screen },
  intro: { gap: spacing.xs, paddingHorizontal: layout.section, paddingTop: spacing.sm },
  callout: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  calloutText: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: layout.section,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
}));
