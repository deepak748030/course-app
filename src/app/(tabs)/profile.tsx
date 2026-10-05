import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Bell, Bookmark, BookOpen, CircleCheck, Clock, LogOut, Settings, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppText, ListRow } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { courses } from '@/data/catalog';
import { useStore } from '@/store';
import { formatDuration, maskPhone } from '@/lib/format';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, state, courseProgressRatio, completedCount, signOut } = useStore();
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}>
        <AppText variant="title">Profile</AppText>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={[type.screenTitle, { color: colors.primary, fontSize: 26, lineHeight: 32 }]}>{initial}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[type.cardTitle, { color: colors.text }]}>{session?.profile.name ?? 'Signed out'}</Text>
            <Text style={[type.supporting, { color: colors.textSecondary }]}>
              {session ? maskPhone(session.profile.phone) : 'No active session'}
            </Text>
            {joined ? (
              <Text style={[type.meta, { color: colors.textSecondary }]}>Member since {joined}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat icon={BookOpen} label="Courses" value={String(stats.courses)} />
          <Stat icon={CircleCheck} label="Lessons done" value={String(stats.lessons)} />
          <Stat icon={Clock} label="Time learned" value={formatDuration(stats.minutes)} />
        </View>

        <View style={styles.card}>
          <ListRow
            icon={Bookmark}
            label="Saved courses"
            subtitle={`${state.savedCourseIds.length} saved · ${state.savedRecipeIds.length} recipes`}
            onPress={() => router.push('/saved')}
          />
          <ListRow
            icon={Bell}
            label="Notifications"
            value={state.notificationsRead ? 'All read' : 'New'}
            onPress={() => router.push('/notifications')}
          />
          <ListRow icon={Settings} label="Settings" subtitle="Notifications, account, data" onPress={() => router.push('/settings')} />
          <ListRow
            icon={ShieldCheck}
            label="Help and support"
            subtitle="Answers and how to reach us"
            onPress={() => router.push('/help')}
          />
        </View>

        <View style={styles.card}>
          <ListRow
            icon={LogOut}
            label="Log out"
            tone="danger"
            chevron={false}
            subtitle="Clears this session and the learning data stored for it"
            onPress={() => setLogoutOpen(true)}
          />
        </View>

        <View style={styles.about}>
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            Rasoi Studio {Constants.expoConfig?.version ?? '1.0.0'} · prototype build
          </Text>
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            Sample catalog, demo authentication and demo payments. No real transactions.
          </Text>
          <View style={styles.progressNote}>
            {enrolled.map((course) => (
              <Text key={course.id} style={[type.meta, { color: colors.textSecondary }]}>
                {course.title}: {completedCount(course)}/{course.lessonCount} · {Math.round(courseProgressRatio(course) * 100)}%
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon size={17} color={colors.sage} strokeWidth={1.9} />
      <Text style={[type.cardTitle, { color: colors.text, fontSize: 17 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.meta, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.xs },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.input,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  about: { gap: spacing.xxs },
  progressNote: { gap: 2, marginTop: spacing.xs },
});
