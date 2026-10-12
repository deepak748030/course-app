import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LogOut, RefreshCcw } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppBar, DataList, ListRow, Screen, SectionHeader, Toggle } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { useStore } from '@/store';

export default function SettingsScreen() {
  const t = useT();

  const router = useRouter();
  const { state, setPreference, resetDeviceData, signOut } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Screen header={<AppBar title={t("Settings")} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
        <View style={styles.section}>
          <SectionHeader title={t("Notifications")} subtitle={t("Stored on this device")} />
          <DataList>
            <Toggle
              label={t("Course updates")}
              help={t("New lessons added to courses you own")}
              value={state.preferences.courseUpdates}
              onChange={(value) => setPreference('courseUpdates', value)}
            />
            <Toggle
              label={t("Learning reminders")}
              help={t("A nudge when you have not watched for a few days")}
              value={state.preferences.learningReminders}
              onChange={(value) => setPreference('learningReminders', value)}
            />
            <Toggle
              label={t("Product news")}
              help={t("New courses and features")}
              value={state.preferences.productNews}
              onChange={(value) => setPreference('productNews', value)}
            />
          </DataList>
          <Text style={[type.label, styles.note, { color: colors.textSubtle }]}>{t("Push delivery is not connected yet. These switches save your choice for when it is.")}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t("Data on this device")} />
          <DataList>
            <ListRow
              icon={RefreshCcw}
              label={t("Clear data on this device")}
              subtitle={t("Clears notes, saved items and cached progress from this phone. Your purchases and progress come back from your account.")}
              onPress={() => setResetOpen(true)}
            />
            <ListRow
              icon={LogOut}
              label={t("Log out")}
              tone="danger"
              subtitle={t("Also removes the learning data stored for this session")}
              onPress={() => setLogoutOpen(true)}
            />
          </DataList>
        </View>

        <View style={styles.about}>
          <Text style={[type.label, { color: colors.textSubtle }]}>
            YDU Academy {Constants.expoConfig?.version ?? '1.0.0'} · Expo SDK {Constants.expoConfig?.sdkVersion ?? '57'}
          </Text>
        </View>
      </Screen>

      <ConfirmSheet
        visible={resetOpen}
        title={t("Clear data on this device?")}
        body={t("Notes, saved items and cached progress on this phone are cleared. Your purchases and progress are restored from your account. You stay signed in.")}
        confirmLabel={t("Clear data")}
        destructive
        onConfirm={() => {
          setResetOpen(false);
          resetDeviceData();
        }}
        onCancel={() => setResetOpen(false)}
      />

      <ConfirmSheet
        visible={logoutOpen}
        title={t("Log out?")}
        body={t("You will need to verify your mobile number again to sign back in. Learning data for this session is removed.")}
        confirmLabel={t("Log out")}
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

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  section: { gap: layout.gap },
  note: { paddingHorizontal: layout.section, paddingTop: spacing.xs },
  about: { gap: spacing.xs, paddingHorizontal: layout.section, paddingTop: spacing.sm },
}));
