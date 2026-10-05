import { useRouter } from 'expo-router';
import { BookOpen, Mail, MessageCircle, RefreshCcw, Share2 } from 'lucide-react-native';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Accordion, AppBar, Badge, Button, DataList, ListRow, Screen, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { faqs } from '@/data/content';
import { useT } from '@/i18n';

export default function HelpScreen() {
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
        <Text style={[type.title, { color: colors.text }]}>{t('How can we help?')}</Text>
        <Text style={[type.body, { color: colors.textMuted }]}>{t("Answers to the questions this prototype raises most often.")}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t("Common questions")} />
        <View style={styles.card}>
          {faqs.map((faq, index) => (
            <Accordion key={faq.id} title={faq.question} defaultOpen={index === 0}>
              <View style={styles.answer}>
                <Text style={[type.body, { color: colors.textMuted }]}>{faq.answer}</Text>
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
            <Text style={[type.body, { color: colors.textMuted, flex: 1 }]}>
              This prototype has no support inbox, so there is no contact form that pretends to send a message. Use the
              share button to pass feedback to your team, along with the screen you were on.
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
            <Text style={[type.body, { color: colors.textMuted, flex: 1 }]}>
              Courses, prices and reviews are sample content. Authentication and payments are demo
              implementations. Anything that is not implemented in the app is said so plainly rather than shown as a
              working control.
            </Text>
          </View>
          <Text style={[type.label, { color: colors.textSubtle }]}>{t("Offline downloads, captions, casting and certificates are not part of this build.")}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = createStyles(() => StyleSheet.create({
  intro: { gap: spacing.sm, paddingHorizontal: layout.section, paddingTop: spacing.sm },
  section: { gap: layout.gap },
  sectionHead: { gap: spacing.xs },
  badgePad: { paddingHorizontal: layout.section },
  card: { backgroundColor: colors.surface, paddingHorizontal: layout.screen, paddingVertical: spacing.xs },
  answer: { paddingHorizontal: 0, paddingBottom: spacing.md, paddingTop: 0 },
  supportCard: {
    marginHorizontal: layout.section,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  supportRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
}));
