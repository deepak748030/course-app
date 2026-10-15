/**
 * Delete account — Google Play requires an in-app path to delete the account and its data.
 *
 * Settings → Delete account opens this screen: what goes, what the law makes us keep, a pointer to
 * the refund policy (deleting does not refund anything), then one red button behind a confirmation
 * sheet. The server deletes the account straight away; the app then clears this phone and returns
 * to sign-in. The public website has the same option for people who no longer have the app.
 */
import { useRouter } from '@/lib/router';
import { FileText, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/bottom-sheet';
import { AppBar, Button, DataList, ListRow, Screen, SectionHeader } from '@/components/ui';
import { createStyles, colors, layout, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { ApiError } from '@/services/api';
import { useStore } from '@/store';

export default function DeleteAccountScreen() {
  const t = useT();
  const router = useRouter();
  const { session, deleteAccount } = useStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleted = [
    t('Your profile: name, mobile number, email, city, goal and photo'),
    t('Your access to the courses you bought, and your progress in them'),
    t('Your ratings, reviews and notifications'),
    t('Notes and saved items on this phone'),
  ];
  const kept = [t('Payment records the law requires us to keep, without your profile')];

  async function confirmDelete() {
    setConfirmOpen(false);
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      Alert.alert(t('Account deleted'), t('Your account and its data have been deleted.'));
      router.replace('/auth/phone');
    } catch (e) {
      setError(
        e instanceof ApiError && !e.isOffline
          ? e.message
          : t('Your account could not be deleted right now. Check your connection and try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Screen header={<AppBar title={t('Delete account')} />} contentStyle={{ paddingBottom: spacing.xxl, gap: layout.sectionGap }}>
        <View style={styles.intro}>
          <Text style={[type.subheading, { color: colors.text }]}>{t('Delete your account permanently')}</Text>
          <Text style={[type.body, { color: colors.textMuted }]}>
            {t('Your account and the data linked to it are deleted straight away. This cannot be undone.')}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('What is deleted')} />
          <Bullets items={deleted} />
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('What is kept')} />
          <Bullets items={kept} />
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('Before you delete')} />
          <Bullets
            items={[
              t('Deleting your account does not refund your courses. If you can still get a refund, ask for it first.'),
              t('Signing in again with the same number creates a new, empty account.'),
            ]}
          />
          <DataList>
            <ListRow
              icon={Undo2}
              label={t('Refund policy')}
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'refund' } })}
            />
            <ListRow
              icon={FileText}
              label={t('Privacy policy')}
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
            />
          </DataList>
        </View>

        <View style={styles.actions}>
          {error ? <Text style={[type.label, styles.error, { color: colors.error }]}>{error}</Text> : null}
          {session ? (
            <Button label={t('Delete my account')} variant="danger" loading={busy} disabled={busy} onPress={() => setConfirmOpen(true)} />
          ) : (
            <Text style={[type.label, { color: colors.textMuted }]}>{t('Sign in to delete your account.')}</Text>
          )}
        </View>
      </Screen>

      <ConfirmSheet
        visible={confirmOpen}
        title={t('Delete your account?')}
        body={t('Your account, your courses and your progress are deleted for good.')}
        confirmLabel={t('Delete account')}
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.points}>
      {items.map((item) => (
        <View key={item} style={styles.point}>
          <Text style={[styles.bullet, { color: colors.textSubtle }]}>•</Text>
          <Text style={[type.body, styles.pointText, { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    intro: { gap: spacing.sm, paddingHorizontal: layout.section },
    section: { gap: layout.gap },
    points: { gap: spacing.sm, paddingHorizontal: layout.section },
    point: { flexDirection: 'row', gap: spacing.sm },
    bullet: { fontSize: type.body.fontSize, lineHeight: type.body.lineHeight, width: 8 },
    pointText: { flex: 1 },
    actions: { gap: spacing.md, paddingHorizontal: layout.section, paddingTop: spacing.sm },
    error: { lineHeight: 18 },
  }),
);
