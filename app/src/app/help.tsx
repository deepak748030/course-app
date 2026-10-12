import { useRouter } from 'expo-router';
import { BookOpen, Mail, MessageCircle, RefreshCcw, Share2 } from 'lucide-react-native';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Accordion, AppBar, Badge, Button, DataList, ListRow, Screen, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useAppContent } from '@/services/app-content';
import { useT } from '@/i18n';

export default function HelpScreen() {
  const { faqs } = useAppContent();
  const t = useT();

  const router = useRouter();

  const shareQuestion = async () => {
    // No support inbox is configured in this prototype, so nothing is submitted anywhere.
    await Share.share({
      message:
        'YDU Academy prototype feedback:\n\n(Describe what happened, which screen, and what you expected.)\n\nThis message is not sent automatically — copy or send it to your team.',
    }).catch(() => {});
  };

  return (
    <Screen header={<AppBar title={t("Help and support")} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
      <View style={styles.intro}>
        <Text style={[type.subheading, { color: colors.text }]}>{t('How can we help?')}</Text>
        <Text style={[docText, { color: colors.textMuted }]}>
          {t('Answers to the questions this prototype raises most often.')}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t("Common questions")} />
        <View style={styles.card}>
          {faqs.map((faq, index) => (
            <Accordion key={faq.id} title={faq.question} defaultOpen={index === 0}>
              <View style={styles.answer}>
                <Text style={[docText, { color: colors.textMuted }]}>{faq.answer}</Text>
              </View>
            </Accordion>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t("Things you can do right now")} />
        <DataList>
          <ListRow
            icon={RefreshCcw}
            label={t("Reset demo data")}
            subtitle={t("Start the learning flow from a clean slate")}
            onPress={() => router.push('/settings')}
          />
          <ListRow
            icon={BookOpen}
            label={t("Browse the catalog")}
            subtitle={t("Sample courses across eight subject areas")}
            onPress={() => router.push('/explore')}
          />
        </DataList>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <SectionHeader title={t("Still stuck?")} />
          <View style={styles.badgePad}>
            <Badge label={t("No inbox connected")} tone="neutral" />
          </View>
        </View>
        <View style={styles.supportCard}>
          <View style={styles.supportRow}>
            <Mail size={18} color={colors.textMuted} strokeWidth={1.9} />
            <Text style={[docText, styles.supportText, { color: colors.textMuted }]}>
              {t('This prototype has no support inbox, so there is no contact form that pretends to send a message. Use the share button to pass feedback to your team, along with the screen you were on.')}
            </Text>
          </View>
          <Button label={t("Share feedback")} icon={Share2} variant="secondary" onPress={shareQuestion} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t("About this build")} />
        <View style={styles.supportCard}>
          <View style={styles.supportRow}>
            <MessageCircle size={18} color={colors.textMuted} strokeWidth={1.9} />
            <Text style={[docText, styles.supportText, { color: colors.textMuted }]}>
              {t('Courses, prices and reviews are sample content. Sign-in codes are demo codes until an SMS provider is connected. Payments are processed by Razorpay. Anything that is not implemented in the app is said so plainly rather than shown as a working control.')}
            </Text>
          </View>
          <Text style={[docText, { color: colors.textSubtle }]}>
            {t('Offline downloads, captions, casting and certificates are not part of this build.')}
          </Text>
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
  sectionHead: { gap: spacing.xs },
  badgePad: { paddingHorizontal: layout.screen },
  card: { backgroundColor: colors.surface, paddingHorizontal: layout.screen, paddingVertical: spacing.xs },
  answer: { paddingHorizontal: 0, paddingBottom: spacing.md, paddingTop: 0 },
  supportCard: {
    marginHorizontal: layout.screen,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  supportRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  supportText: { flex: 1 },
}));
