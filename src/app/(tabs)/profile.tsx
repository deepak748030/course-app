import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Bell,
  Bookmark,
  BookOpen,
  CalendarDays,
  Camera,
  CircleCheck,
  Clock,
  LogOut,
  Mail,
  MapPin,
  NotebookPen,
  Settings,
  ShieldCheck,
  Smartphone,
  SquarePen,
  Target,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { ProfileEditorSheet } from '@/components/profile-editor';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  DataList,
  IconButton,
  ListRow,
  ProgressBar,
  Screen,
  TabHeader,
} from '@/components/ui';
import { colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { courses } from '@/data/catalog';
import { ageFromDateOfBirth, formatDateOfBirth, formatDuration, maskPhone } from '@/lib/format';
import { pickProfilePhoto } from '@/lib/photo';
import { useStore } from '@/store';
import type { UserProfile } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, state, signOut, updateProfile, setProfileAvatar } = useStore();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  const profile = session?.profile ?? null;
  const avatarUri = state.profileAvatarUri;

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

  const notesWritten = useMemo(
    () => Object.values(state.notes).filter((note) => note.trim().length > 0).length,
    [state.notes],
  );

  const joined = profile?.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;
  const birthDate = formatDateOfBirth(profile?.dateOfBirth);
  const age = ageFromDateOfBirth(profile?.dateOfBirth);

  const details = useMemo(
    () =>
      [
        { key: 'name', label: 'Full name', icon: UserRound, value: profile?.name ?? null },
        { key: 'email', label: 'Email', icon: Mail, value: profile?.email ?? null },
        {
          key: 'dob',
          label: 'Date of birth',
          icon: CalendarDays,
          value: birthDate ? `${birthDate}${age !== null ? ` · ${age} years` : ''}` : null,
        },
        { key: 'city', label: 'City', icon: MapPin, value: profile?.city ?? null },
        { key: 'goal', label: 'Cooking goal', icon: Target, value: profile?.goal ?? null },
      ] as const,
    [age, birthDate, profile?.city, profile?.email, profile?.goal, profile?.name],
  );

  const filled = details.filter((detail) => detail.value).length + (avatarUri ? 1 : 0);
  const total = details.length + 1;
  const missing = details.filter((detail) => !detail.value).map((detail) => detail.label.toLowerCase());
  const completion = Math.round((filled / total) * 100);

  async function changePhoto() {
    if (photoBusy) return;
    setPhotoBusy(true);
    const result = await pickProfilePhoto();
    setPhotoBusy(false);
    if (result.ok) {
      setProfileAvatar(result.uri);
      setPhotoNotice(null);
      return;
    }
    if (result.reason === 'permission') {
      setPhotoNotice('Photo access is switched off for Rasoi Studio. Turn it on in your device settings, then try again.');
    } else if (result.reason === 'failed') {
      setPhotoNotice('That image could not be read. Try another photo.');
    }
  }

  async function saveProfile(patch: Partial<UserProfile>) {
    setSaving(true);
    await updateProfile(patch);
    setSaving(false);
    setEditorOpen(false);
  }

  return (
    <Screen
      contentStyle={styles.content}
      header={
        <TabHeader
          bordered
          leading={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={avatarUri ? 'Change profile photo' : 'Add a profile photo'}
              onPress={changePhoto}
              style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}>
              <Avatar name={profile?.name ?? 'Guest'} uri={avatarUri} size={44} />
              <View style={styles.avatarBadge}>
                <Camera size={11} color={colors.onAccent} strokeWidth={2.2} />
              </View>
            </Pressable>
          }
          title={profile?.name ?? 'Signed out'}
          meta={
            profile ? profile.email ?? maskPhone(profile.phone) : 'Sign in to keep your progress on this device'
          }
          actions={
            <>
              {profile ? (
                <IconButton
                  icon={SquarePen}
                  variant="soft"
                  accessibilityLabel="Edit profile"
                  onPress={() => setEditorOpen(true)}
                />
              ) : null}
              <IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
            </>
          }
        />
      }>
      {profile ? (
        <View style={styles.summaryCard}>
          <DataList dividerInset={layout.screen + 32 + spacing.md}>
            <ListRow
              icon={Camera}
              label="Profile photo"
              onPress={changePhoto}
              rightSlot={
                avatarUri ? (
                  <Avatar name={profile.name} uri={avatarUri} size={28} />
                ) : (
                  <Text style={[type.labelStrong, { color: colors.accentText }]}>Add</Text>
                )
              }
            />
            {details.map((detail) => (
              <ListRow
                key={detail.key}
                icon={detail.icon}
                label={detail.label}
                value={detail.value ?? undefined}
                onPress={() => setEditorOpen(true)}
                rightSlot={
                  detail.value ? undefined : <Text style={[type.labelStrong, { color: colors.accentText }]}>Add</Text>
                }
              />
            ))}
            {/* Read-only: changing the sign-in number means verifying a new one. */}
            <ListRow icon={Smartphone} label="Mobile number" subtitle={maskPhone(profile.phone)} chevron={false} />
          </DataList>

          <View style={styles.completion}>
            <View style={styles.completionRow}>
              <Text style={[type.labelStrong, { color: colors.textMuted }]}>{`Profile ${filled} of ${total}`}</Text>
              <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>{`${completion}%`}</Text>
            </View>
            <ProgressBar value={filled / total} accessibilityLabel="Profile completeness" />
            <Text style={[type.label, { color: colors.textSubtle }]}>
              {missing.length === 0
                ? 'Your profile is complete.'
                : `Add ${missing.slice(0, 2).join(' and ')}${missing.length > 2 ? ` and ${missing.length - 2} more` : ''} to complete it.`}
            </Text>
            <Button
              label={missing.length === 0 ? 'Edit profile' : 'Complete your profile'}
              variant="secondary"
              icon={SquarePen}
              onPress={() => setEditorOpen(true)}
            />
          </View>

          {photoNotice ? (
            <Text style={[type.label, styles.notice, { color: colors.error }]}>{photoNotice}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.pad}>
          <View style={styles.signInCard}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>You are not signed in</Text>
            <Text style={[type.label, { color: colors.textMuted }]}>
              Sign in to keep your courses, notes and progress on this device.
            </Text>
            <Button label="Sign in with mobile" onPress={() => router.push('/auth/phone')} />
          </View>
        </View>
      )}

      <View style={styles.pad}>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Stat icon={BookOpen} label="Courses" value={String(stats.courses)} />
            <View style={styles.statDivider} />
            <Stat icon={CircleCheck} label="Lessons done" value={String(stats.lessons)} />
            <View style={styles.statDivider} />
            <Stat icon={Clock} label="Time learned" value={formatDuration(stats.minutes)} />
          </View>
          <View style={styles.statHairline} />
          <View style={styles.statRow}>
            <Stat icon={Bookmark} label="Saved courses" value={String(state.savedCourseIds.length)} />
            <View style={styles.statDivider} />
            <Stat icon={UtensilsCrossed} label="Saved recipes" value={String(state.savedRecipeIds.length)} />
            <View style={styles.statDivider} />
            <Stat icon={NotebookPen} label="Notes written" value={String(notesWritten)} />
          </View>
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
            <ListRow
              icon={BookOpen}
              label="My learning"
              subtitle={joined ? `Member since ${joined}` : 'Courses you own and finish'}
              onPress={() => router.push('/learning')}
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

      {profile ? (
        <ProfileEditorSheet
          visible={editorOpen}
          profile={profile}
          avatarUri={avatarUri}
          saving={saving}
          photoBusy={photoBusy}
          onClose={() => setEditorOpen(false)}
          onPickPhoto={changePhoto}
          onRemovePhoto={() => {
            setProfileAvatar(null);
            setPhotoNotice(null);
          }}
          onSave={saveProfile}
        />
      ) : null}

      <ConfirmSheet
        visible={logoutOpen}
        title="Log out of Rasoi Studio?"
        body="Your session and the courses, progress and notes stored for it are removed from this device. Onboarding and app preferences stay."
        confirmLabel="Log out"
        destructive
        onConfirm={async () => {
          setLogoutOpen(false);
          setProfileAvatar(null);
          await signOut();
          router.replace('/auth/phone');
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </Screen>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
  content: { gap: layout.sectionGap, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  pad: { paddingHorizontal: layout.screen, gap: layout.gap },
  avatarWrap: { width: 44, height: 44 },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  summaryCard: {
    marginHorizontal: layout.screen,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  completion: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  completionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  signInCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  statRow: { flexDirection: 'row' },
  statHairline: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md, marginHorizontal: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  group: { gap: spacing.sm },
  groupTitle: { paddingHorizontal: layout.section },
  card: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  about: { gap: spacing.xs, paddingTop: spacing.md },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
