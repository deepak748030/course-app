import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LogOut, RefreshCcw, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppText, Badge, ListRow, ScreenHeader } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { useStore } from '@/store';
import { formatIndianMobile } from '@/lib/format';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, state, setPreference, resetDemoData, signOut } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" />

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Notifications</Text>
          <View style={styles.card}>
            <SwitchRow
              label="Course updates"
              help="New lessons added to courses you own"
              value={state.preferences.courseUpdates}
              onChange={(value) => setPreference('courseUpdates', value)}
            />
            <SwitchRow
              label="Learning reminders"
              help="A nudge when you have not watched for a few days"
              value={state.preferences.learningReminders}
              onChange={(value) => setPreference('learningReminders', value)}
            />
            <SwitchRow
              label="Product news"
              help="New instructors and features"
              value={state.preferences.productNews}
              onChange={(value) => setPreference('productNews', value)}
            />
          </View>
          <Text style={[type.meta, { color: colors.textSecondary }]}>
            Preferences are stored on this device. Push delivery is not wired up in this prototype, so these switches
            only control what the app would send.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Account</Text>
          <View style={styles.card}>
            <ListRow
              label="Mobile number"
              value={session ? formatIndianMobile(session.profile.phone) : 'Not signed in'}
              chevron={false}
            />
            <ListRow
              label="Change number"
              subtitle="Signs you out so you can verify a different number"
              onPress={() => setLogoutOpen(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Payments</Text>
          <View style={styles.card}>
            <ListRow
              icon={ShieldCheck}
              label="Payment security"
              subtitle="This build has no payment gateway; demo purchases only unlock a course locally."
              chevron={false}
              rightSlot={<Badge label="Demo" tone="gold" />}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Data on this device</Text>
          <View style={styles.card}>
            <ListRow
              icon={RefreshCcw}
              label="Reset demo data"
              subtitle="Clears purchases, progress, notes and saved items. Keeps your session."
              onPress={() => setResetOpen(true)}
            />
            <ListRow
              icon={LogOut}
              label="Log out"
              tone="danger"
              subtitle="Also removes the learning data stored for this session"
              onPress={() => setLogoutOpen(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.section, { color: colors.text }]}>Policies</Text>
          <View style={styles.card}>
            <ListRow label="Terms of use" subtitle="Sample document" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
            <ListRow label="Privacy" subtitle="Sample document" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
            <ListRow label="Help and support" onPress={() => router.push('/help')} />
          </View>
        </View>

        <View style={styles.about}>
          <AppText variant="meta" color={colors.textSecondary}>
            Rasoi Studio {Constants.expoConfig?.version ?? '1.0.0'} · Expo SDK {Constants.expoConfig?.sdkVersion ?? '57'}
          </AppText>
          <AppText variant="meta" color={colors.textSecondary}>
            Prototype build: sample catalog, demo authentication, demo payments.
          </AppText>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={resetOpen}
        title="Reset demo data?"
        body="Purchases, lesson progress, notes and saved items on this device are cleared. You stay signed in."
        confirmLabel="Reset data"
        destructive
        onConfirm={() => {
          setResetOpen(false);
          resetDemoData();
        }}
        onCancel={() => setResetOpen(false)}
      />

      <ConfirmSheet
        visible={logoutOpen}
        title="Log out?"
        body="You will need to verify your mobile number again to sign back in. Learning data for this session is removed."
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

function SwitchRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={[type.body, { color: colors.text }]}>{label}</Text>
        <Text style={[type.supporting, { color: colors.textSecondary }]}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={help}
        trackColor={{ false: colors.border, true: colors.sage }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  section: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  about: { gap: spacing.xxs, marginTop: spacing.sm },
});
