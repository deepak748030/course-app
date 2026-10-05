import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Bell, Bookmark, BookOpen, CircleCheck, Clock, LogOut, Settings, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppText, Badge, Button, DataList, ListRow, Screen } from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courses } from '@/data/catalog';
import { formatDuration, maskPhone } from '@/lib/format';
import { useStore } from '@/store';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, state, signOut } = useStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const enrolled = useMemo(() => courses.filter((course) => state.enrollments[course.id]), [state.enrollments]);

  const stats = useMemo(() => {
    let lessons = 0;
    let minutes = 0;
    enrolled.forEach((course) => {
      course.lessons.forEach((lesson) => {
        if (state.progress[course.id]?.[lesson.id]?.completed) {
          lessons += 1;
          minutes += lesson.minutes;
        }
      });
    });
    return { lessons, minutes, courses: enrolled.length };
  }, [enrolled, state.progress]);

  const initial = (session?.profile.name ?? 'R').charAt(0).toUpperCase();
  const joined = session?.profile.joinedAt
    ? new Date(session.profile.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={[type.display, styles.title, { color: colors.text }]}>Profile</Text>

      <View style={styles.pad}>
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={[type.title, { color: colors.primary }]}>{initial}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>
              {session?.profile.name ?? 'Signed out'}
            </Text>
            <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
              {session ? maskPhone(session.profile.phone) : 'No active session'}
            </Text>
            {joined ? <Text style={[type.label, { color: colors.textSubtle }]}>Member since {joined}</Text> : null}
          </View>
        </View>

        <View style={styles.statsCard}>
          <Stat icon={BookOpen} label="Courses" value={String(stats.courses)} />
          <View style={styles.statDivider} />
          <Stat icon={CircleCheck} label="Lessons done" value={String(stats.lessons)} />
          <View style={styles.statDivider} />
          <Stat icon={Clock} label="Time learned" value={formatDuration(stats.minutes)} />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[type.labelStrong, styles.groupTitle, { color: colors.textMuted }]}>Your library</Text>
        <View style={styles.card}>
          <DataList dividerInset={layout.screen + 32 + spacing.md}>
            <ListRow
              icon={Bookmark}
              label="Saved"
              subtitle={`${state.savedCourseIds.length} courses · ${state.savedRecipeIds.length} recipes`}
              onPress={() => router.push('/saved')}
            />
            <ListRow
              icon={Bell}
              label="Notifications"
              value={state.notificationsRead ? 'All read' : 'New'}
              onPress={() => router.push('/notifications')}
            />
          </DataList>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[type.labelStrong, styles.groupTitle, { color: colors.textMuted }]}>Settings & support</Text>
        <View style={styles.card}>
          <DataList dividerInset={layout.screen + 32 + spacing.md}>
            <ListRow icon={Settings} label="Settings" subtitle="Notifications, account, app data" onPress={() => router.push('/settings')} />
            <ListRow icon={ShieldCheck} label="Help and support" subtitle="Answers and how to reach us" onPress={() => router.push('/help')} />
          </DataList>
        </View>
      </View>

      <View style={styles.pad}>
        <Button label="Log out" variant="danger" icon={LogOut} onPress={() => setLogoutOpen(true)} />
        <View style={styles.about}>
          <View style={styles.aboutRow}>
            <AppText variant="label" color={colors.textSubtle}>
              Rasoi Studio {Constants.expoConfig?.version ?? '1.0.0'} · prototype build
            </AppText>
            <Badge label="Demo" tone="gold" />
          </View>
          <AppText variant="label" color={colors.textSubtle}>
            Sample catalog, demo authentication and demo payments. No real transactions.
          </AppText>
        </View>
      </View>

      <ConfirmSheet
        visible={logoutOpen}
        title="Log out of Rasoi Studio?"
        body="Your session and the courses, progress and notes stored for it are removed from this device. Onboarding and app preferences stay."
        confirmLabel="Log out"
        destructive
        onConfirm={async () => {
          setLogoutOpen(false);
          await signOut();
          router.replace('/auth/phone');
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </Screen>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={16} color={colors.sage} strokeWidth={1.75} />
      <AppText variant="subheading" style={tabularNums}>
        {value}
      </AppText>
      <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: layout.sectionGap, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  title: { paddingHorizontal: layout.section, paddingTop: spacing.sm },
  pad: { paddingHorizontal: layout.screen, gap: layout.gap },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginTop: layout.gap,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  group: { gap: spacing.sm },
  groupTitle: { paddingHorizontal: layout.section },
  card: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  about: { gap: spacing.xs, paddingTop: spacing.md },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
