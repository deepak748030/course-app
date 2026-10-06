/**
 * One policy document per screen — no tab strip in here.
 *
 * Terms, Privacy and Refunds are three separate destinations that Profile links to, so this screen
 * reads like the rest of the app instead of a document viewer:
 *   - an app bar carrying the document's name;
 *   - a hero block: the document icon, the overline that says the copy is a placeholder, the summary
 *     and how much there is to read;
 *   - the warning a reader should see *before* the text, not as small print at the bottom;
 *   - the document itself as one card, its sections numbered and split by hairlines, so it scans
 *     like a list of points rather than a wall of paragraphs.
 *
 * The document copy stays in English on purpose — it is placeholder material a lawyer has to
 * replace — and the note at the foot of the screen says so in whichever language the interface is in.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, LifeBuoy, TriangleAlert } from 'lucide-react-native';
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
      {/* Hero: which document this is, what it covers, and how final it is. */}
      <View style={styles.hero}>
        <View style={styles.heroPlate} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FileText size={22} color={colors.accentText} strokeWidth={1.9} />
        </View>
        <View style={styles.flex}>
          <Text style={[type.overline, { color: colors.textSubtle }]}>{t('Sample document')}</Text>
          <Text style={[type.subheading, styles.heroSummary, { color: colors.text }]}>
            {t(document.summary)}
          </Text>
          <Text style={[type.label, { color: colors.textMuted }]}>
            {t('{n} sections · English sample', { n: document.sections.length })}
          </Text>
        </View>
      </View>

      {/* The warning that matters is the one a reader can see before the text. */}
      <View style={styles.pad}>
        <View style={styles.callout}>
          <View style={styles.calloutIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <TriangleAlert size={16} color={colors.text} strokeWidth={2} />
          </View>
          <Text style={[type.body, styles.calloutText, { color: colors.text }]}>
            {t(
              'Before distributing YDU Academy, replace this placeholder with documents reviewed by a lawyer.',
            )}
          </Text>
        </View>
      </View>

      {/* The document: one card, numbered sections, hairline between them. */}
      <View style={styles.pad}>
        <View style={styles.card}>
          {document.sections.map((section, index) => (
            <View key={section.heading}>
              {index > 0 ? <View style={styles.rule} /> : null}
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  {/* The number is the point of the card: it makes the outline readable at a glance. */}
                  <View style={styles.sectionNumber}>
                    <Text style={[type.labelStrong, { color: colors.accentText }]}>{index + 1}</Text>
                  </View>
                  <Text style={[type.subheading, styles.flex, { color: colors.text }]}>
                    {section.heading}
                  </Text>
                </View>
                {section.body.map((paragraph) => (
                  <Text key={paragraph} style={[type.body, { color: colors.text }]}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

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
  flex: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: layout.section,
    paddingTop: spacing.sm,
  },
  heroPlate: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSummary: { marginTop: 2, marginBottom: spacing.xs },
  callout: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  calloutIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rule: { height: 1, backgroundColor: colors.divider },
  section: {
    gap: spacing.sm,
    paddingHorizontal: layout.section,
    paddingVertical: spacing.md,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
