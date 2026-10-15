/**
 * One policy document per screen, laid out like the document it stands in for.
 *
 * Terms, Privacy and Refunds are three separate destinations that Profile links to. The screen shows
 * the clause list itself and nothing else: a document heading with the line that says how final the
 * copy is, then a heading and body per clause, with bullet points where the copy lists things. No tab
 * strip, no card per section, no numbered badges — a reader who came here to check a clause reads
 * text, not chrome.
 *
 * The copy is small print, so it is set one step down from the app's reading size (see `docText`),
 * which is what keeps a long document from looking like a landing page. Everything stays inside the
 * app's own type scale: 19 for the document title, 15 for clause headings, 12 for the body, which are
 * four steps of the same 1.25 ladder the rest of the app uses.
 *
 * The documents come from the admin's Content page (or the built-in text, with the academy's
 * business details filled in — see services/app-content.ts) and are the same ones the public website
 * shows. Their copy stays in English, and the note at the foot of the screen says so in whichever
 * language the interface is in.
 */

import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router';
import { LifeBuoy } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, DataList, ListRow, Screen } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useAppContent, type LegalKey } from '@/services/app-content';
import { useT } from '@/i18n';

type DocKey = LegalKey;

export default function LegalScreen() {
  const { legalDocs } = useAppContent();
  const t = useT();

  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();

  const key: DocKey = doc === 'privacy' || doc === 'refund' ? doc : 'terms';
  const document = legalDocs[key];

  return (
    <Screen
      header={<AppBar title={t(document.title)} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {/* The document. Its own title, the line that says how final it is, then clause by clause. */}
      <View style={styles.doc}>
        <View style={styles.docHead}>
          <Text style={[type.subheading, { color: colors.text }]}>{document.heading}</Text>
          <Text style={[type.label, { color: colors.textSubtle }]}>
            {t('Official policy')}
          </Text>
        </View>

        <View style={styles.document}>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={[type.bodyStrong, styles.heading, { color: colors.text }]}>{section.heading}</Text>

              {section.body?.map((paragraph) => (
                <Text key={paragraph} style={[docText, { color: colors.text }]}>
                  {paragraph}
                </Text>
              ))}

              {section.points ? (
                <View style={styles.points}>
                  {section.points.map((point) => (
                    <View key={point} style={styles.point}>
                      <Text style={[styles.bullet, { color: colors.textSubtle }]}>•</Text>
                      <Text style={[docText, styles.pointText, { color: colors.text }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.footNote}>
          <Text style={[docText, { color: colors.textSubtle }]}>
            {t('Course titles and lesson copy stay in English.')}
          </Text>
        </View>
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

/** Body copy of a document: the 12pt step of the scale, opened up to 1.6 for reading. */
const docText = {
  fontFamily: type.body.fontFamily,
  fontSize: type.label.fontSize,
  lineHeight: 19,
  letterSpacing: 0,
} as const;

const styles = createStyles(() => StyleSheet.create({
  /** The document itself: 8pt of side padding, so the text uses the width it needs. */
  doc: { paddingHorizontal: layout.screen },
  docHead: { gap: 2, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  document: { gap: spacing.lg, paddingTop: spacing.lg },
  section: { gap: spacing.sm },
  heading: { lineHeight: 21 },
  points: { gap: spacing.xs, paddingTop: 2 },
  point: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: type.label.fontSize, lineHeight: 19, width: 6 },
  pointText: { flex: 1 },
  footNote: { paddingTop: spacing.lg },
  pad: { paddingHorizontal: layout.screen },
}));
