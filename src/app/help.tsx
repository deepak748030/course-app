import { useRouter } from 'expo-router';
import { BookOpen, Mail, MessageCircle, RefreshCcw, Share2 } from 'lucide-react-native';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Accordion, AppText, Badge, ListRow, PrimaryButton, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { faqs } from '@/data/content';

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const shareQuestion = async () => {
    // No support inbox is configured in this prototype, so nothing is submitted anywhere.
    await Share.share({
      message:
        'Rasoi Studio prototype feedback:\n\n(Describe what happened, which screen, and what you expected.)\n\nThis message is not sent automatically — copy or send it to your team.',
    }).catch(() => {});
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Help and support" />

        <View style={styles.intro}>
          <Text style={[type.screenTitle, { color: colors.text, fontSize: 25, lineHeight: 32 }]}>
            How can we help?
          </Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Answers to the questions this prototype raises most often.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Common questions</Text>
          <View style={styles.faqCard}>
            {faqs.map((faq, index) => (
              <Accordion key={faq.id} title={faq.question} defaultOpen={index === 0}>
                <Text style={[type.supporting, { color: colors.textSecondary }]}>{faq.answer}</Text>
              </Accordion>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Things you can do right now</Text>
          <View style={styles.actionsCard}>
            <ListRow
              icon={RefreshCcw}
              label="Reset demo data"
              subtitle="Start the learning flow from a clean slate"
              onPress={() => router.push('/settings')}
            />
            <ListRow
              icon={BookOpen}
              label="Browse the catalog"
              subtitle="Sample courses across eight subject areas"
              onPress={() => router.push('/explore')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.section, { color: colors.text }]}>Still stuck?</Text>
            <Badge label="No inbox connected" tone="neutral" />
          </View>
          <View style={styles.supportCard}>
            <View style={styles.supportRow}>
              <Mail size={18} color={colors.textSecondary} strokeWidth={1.9} />
              <Text style={[type.supporting, { color: colors.textSecondary, flex: 1 }]}>
                This prototype has no support inbox, so there is no contact form that pretends to send a message. Use
                the share button to pass feedback to your team, along with the screen you were on.
              </Text>
            </View>
            <PrimaryButton label="Share feedback" icon={Share2} onPress={shareQuestion} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>About this build</Text>
          <View style={styles.supportCard}>
            <View style={styles.supportRow}>
              <MessageCircle size={18} color={colors.textSecondary} strokeWidth={1.9} />
              <Text style={[type.supporting, { color: colors.textSecondary, flex: 1 }]}>
                Courses, instructors, prices and reviews are sample content. Authentication and payments are demo
                implementations. Anything that is not implemented in the app is said so plainly rather than shown as a
                working control.
              </Text>
            </View>
            <AppText variant="meta" color={colors.textSecondary}>
              Offline downloads, captions, casting and certificates are not part of this build.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.xl,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  intro: { gap: spacing.xs },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  supportCard: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  supportRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
