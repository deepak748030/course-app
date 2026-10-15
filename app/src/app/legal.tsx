/**
 * One policy document per screen, laid out like the document it stands in for.
 *
 * Terms, Privacy and Refunds are three separate destinations that Profile links to. The screen shows
 * the clause list itself and nothing else: a document heading with its summary line (when it was last
 * updated, and what it covers), then a heading and body per clause, with bullet points where the copy
 * lists things. No tab strip, no card per section, no numbered badges — a reader who came here to
 * check a clause reads text, not chrome.
 *
 * The copy is small print, so it is set one step down from the app's reading size (see `docText`),
 * which is what keeps a long document from looking like a landing page. Everything stays inside the
 * app's own type scale: 19 for the document title, 15 for clause headings, 12 for the body, which are
 * four steps of the same 1.25 ladder the rest of the app uses.
 *
 * The document copy stays in English on purpose: it is the same text the server publishes under
 * /legal for the Play listing, and a translated policy would be a second legal text to keep in step.
 * The note at the foot of the screen says so in whichever language the interface is in. Contact
 * details in the copy are written as {{supportEmail}} / {{supportPhone}} and filled in here from
 * the server settings, the same way the web pages fill them.
 */

import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router';
import { LifeBuoy, Mail, Phone, Trash } from 'lucide-react-native';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AppBar, DataList, ListRow, Screen } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useStore } from '@/store';
import { useAppContent, type LegalKey } from '@/services/app-content';
import { useT } from '@/i18n';

type DocKey = LegalKey;

/** Every document the route accepts; anything else falls back to the terms. */
const DOC_KEYS: readonly DocKey[] = ['terms', 'privacy', 'refund', 'delete-account', 'about', 'contact', 'disclaimer'];

const TOKEN = /\{\{\s*(appName|supportEmail|supportPhone)\s*\}\}/g;

/** Fills the contact tokens in a line of copy; one not known yet keeps its placeholder wording. */
function fillTokens(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN, (match, name: string) => values[name] || match);
}

export default function LegalScreen() {
  const { legalDocs } = useAppContent();
  const t = useT();

  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const router = useRouter();

  const { session, settings } = useStore();
  const key: DocKey = DOC_KEYS.includes(doc as DocKey) ? (doc as DocKey) : 'terms';
  const document = legalDocs[key];

  /** The contact page doubles as the place to actually reach someone: the rows below the copy. */
  const supportEmail = settings?.supportEmail?.trim() ?? '';
  const supportPhone = settings?.supportPhone?.trim() ?? '';
  /** Before settings arrive (first launch offline) the copy points at the Contact us page instead. */
  const fill = (text: string) =>
    fillTokens(text, {
      appName: settings?.appName?.trim() || 'YDU Academy',
      supportEmail: supportEmail || 'the support email on the Contact us page',
      supportPhone: supportPhone || 'the support number on the Contact us page',
    });

  return (
    <Screen
      header={<AppBar title={t(document.title)} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      {/* The document. Its own title, the summary line (last updated, what it covers), then clause by clause. */}
      <View style={styles.doc}>
        <View style={styles.docHead}>
          <Text style={[type.subheading, { color: colors.text }]}>{fill(document.heading)}</Text>
          <Text style={[type.label, { color: colors.textSubtle }]}>
            {document.summary ? fill(document.summary) : t('Official policy')}
          </Text>
        </View>

        <View style={styles.document}>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={[type.bodyStrong, styles.heading, { color: colors.text }]}>{fill(section.heading)}</Text>

              {section.body?.map((paragraph) => (
                <Text key={paragraph} style={[docText, { color: colors.text }]}>
                  {fill(paragraph)}
                </Text>
              ))}

              {section.points ? (
                <View style={styles.points}>
                  {section.points.map((point) => (
                    <View key={point} style={styles.point}>
                      <Text style={[styles.bullet, { color: colors.textSubtle }]}>•</Text>
                      <Text style={[docText, styles.pointText, { color: colors.text }]}>{fill(point)}</Text>
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

      {/* Signed in, the deletion page leads straight to the place it describes: Settings → Delete account. */}
      {key === 'delete-account' && session ? (
        <View style={styles.pad}>
          <DataList>
            <ListRow
              icon={Trash}
              label={t('Delete account')}
              subtitle={t('Deletes your profile, purchases, progress and reviews for good')}
              onPress={() => router.push('/settings')}
            />
          </DataList>
        </View>
      ) : null}

      {/* Contact is the one document with something to act on: reach the team right from the page. */}
      {key === 'contact' && (supportEmail || supportPhone) ? (
        <View style={styles.pad}>
          <DataList>
            {supportEmail ? (
              <ListRow
                icon={Mail}
                label={t('Email us')}
                subtitle={supportEmail}
                onPress={() => void Linking.openURL(`mailto:${supportEmail}`).catch(() => {})}
              />
            ) : null}
            {supportPhone ? (
              <ListRow
                icon={Phone}
                label={t('Call us')}
                subtitle={supportPhone}
                onPress={() => void Linking.openURL(`tel:${supportPhone.replace(/[^\d+]/g, '')}`).catch(() => {})}
              />
            ) : null}
          </DataList>
        </View>
      ) : null}

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
