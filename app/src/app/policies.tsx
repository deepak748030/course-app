/**
 * Every policy page in one place: about, contact, privacy, terms, refund and the disclaimer.
 *
 * This is the destination Profile and the sign-in screen link to, so a reader who has not signed in
 * (or does not want to) can still reach what the Google Play listing promises — the same six
 * documents are also published as plain web pages on the academy server under /legal, which is the
 * URL the Play Console takes.
 *
 * The rows are laid out the way Profile's policy group is: a heading, then one row per document,
 * each opening the document screen itself (one document per screen, no tab strip). Labels are the
 * documents' screen names, translated where the dictionary has them; the copy behind them is the
 * document's own.
 */

import { useRouter } from '@/lib/router';
import { FileText, Info, Mail, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppBar, DataList, ListRow, Screen, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useAppContent, type LegalKey } from '@/services/app-content';
import { useT } from '@/i18n';

export default function PoliciesScreen() {
  const t = useT();
  const router = useRouter();

  const open = (key: LegalKey) => router.push({ pathname: '/legal', params: { doc: key } });

  return (
    <Screen
      header={<AppBar title={t('Policies')} />}
      contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}
    >
      <View style={styles.intro}>
        <Text style={[docText, { color: colors.textMuted }]}>
          {t('Every page here opens without signing in.')}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('About the academy')} />
        <View style={styles.card}>
          <DataList dividerInset={layout.screen + 32 + spacing.md}>
            <ListRow
              icon={Info}
              label={t('About us')}
              subtitle={t('Who we are and what we teach')}
              onPress={() => open('about')}
            />
            <ListRow
              icon={Mail}
              label={t('Contact us')}
              subtitle={t('How to reach the academy team')}
              onPress={() => open('contact')}
            />
          </DataList>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('Policies')} />
        <View style={styles.card}>
          <DataList dividerInset={layout.screen + 32 + spacing.md}>
            <ListRow
              icon={ShieldCheck}
              label={t('Privacy policy')}
              subtitle={t('What is stored, and where')}
              onPress={() => open('privacy')}
            />
            <ListRow
              icon={FileText}
              label={t('Terms of use')}
              subtitle={t('The rules for using the academy')}
              onPress={() => open('terms')}
            />
            <ListRow
              icon={RotateCcw}
              label={t('Refund policy')}
              subtitle={t('When a course can be refunded')}
              onPress={() => open('refund')}
            />
            <ListRow
              icon={TriangleAlert}
              label={t('Disclaimer')}
              subtitle={t('What the lessons do and do not cover')}
              onPress={() => open('disclaimer')}
            />
          </DataList>
        </View>
      </View>
    </Screen>
  );
}

/** Small print: the same 12pt step, opened up to 1.6, that the policy documents use. */
const docText = {
  fontFamily: type.body.fontFamily,
  fontSize: type.label.fontSize,
  lineHeight: 19,
  letterSpacing: 0,
} as const;

const styles = createStyles(() => StyleSheet.create({
  intro: { gap: spacing.xs, paddingHorizontal: layout.screen, paddingTop: spacing.sm },
  section: { gap: layout.gap },
  card: { backgroundColor: colors.surface, paddingHorizontal: layout.screen, paddingVertical: spacing.xs },
}));
