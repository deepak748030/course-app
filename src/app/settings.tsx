import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LogOut, RefreshCcw, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppBar, Badge, DataList, ListRow, Screen, SectionHeader, Toggle } from '@/components/ui';
import { colors, layout, spacing, type } from '@/constants/theme';
import { useStore } from '@/store';
import { formatIndianMobile } from '@/lib/format';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, state, setPreference, resetDemoData, signOut } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Screen header={<AppBar title="Settings" />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
        <View style={styles.section}>
          <SectionHeader title="Notifications" subtitle="Stored on this device" />
          <DataList>
            <Toggle
              label="Course updates"
              help="New lessons added to courses you own"
              value={state.preferences.courseUpdates}
              onChange={(value) => setPreference('courseUpdates', value)}
            />
            <Toggle
              label="Learning reminders"
              help="A nudge when you have not watched for a few days"
              value={state.preferences.learningReminders}
              onChange={(value) => setPreference('learningReminders', value)}
            />
            <Toggle
              label="Product news"
              help="New instructors and features"
              value={state.preferences.productNews}
              onChange={(value) => setPreference('productNews', value)}
            />
          </DataList>
          <Text style={[type.label, styles.note, { color: colors.textSubtle }]}>
            Push delivery is not wired up in this prototype, so these switches only control what the app would send.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Account" />
          <DataList>
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
          </DataList>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Payments" />
          <DataList>
            <ListRow
              icon={ShieldCheck}
              label="Payment security"
              subtitle="This build has no payment gateway; demo purchases only unlock a course locally."
              chevron={false}
              rightSlot={<Badge label="Demo" tone="gold" />}
            />
          </DataList>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Data on this device" />
          <DataList>
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
          </DataList>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Policies" subtitle="Sample documents" />
          <DataList>
            <ListRow label="Terms of use" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
            <ListRow label="Privacy" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
            <ListRow label="Help and support" onPress={() => router.push('/help')} />
          </DataList>
        </View>

        <View style={styles.about}>
          <Text style={[type.label, { color: colors.textSubtle }]}>
            Rasoi Studio {Constants.expoConfig?.version ?? '1.0.0'} · Expo SDK {Constants.expoConfig?.sdkVersion ?? '57'}
          </Text>
          <Text style={[type.label, { color: colors.textSubtle }]}>
            Prototype build: sample catalog, demo authentication, demo payments.
          </Text>
        </View>
      </Screen>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  section: { gap: layout.gap },
  note: { paddingHorizontal: layout.section, paddingTop: spacing.xs },
  about: { gap: spacing.xs, paddingHorizontal: layout.section, paddingTop: spacing.sm },
});
