/**
 * Profile editor.
 *
 * Name, email, date of birth, city and a dairy goal in one sheet — no wizard, no extra screens. Save
 * stays disabled until something changed and every field passes validation. Date of birth is three
 * plain fields on purpose: no picker dependency, and DD / MM / YYYY is how the date is written on
 * paper in India.
 *
 * The mobile number is the one thing on this sheet that is *shown* rather than asked for: it is the
 * identity the session was created with, so it sits at the top as a read-only value with the reason
 * under it — not an input box that quietly does nothing when you type in it.
 */
import { useT } from '@/i18n';

import { Camera, Info, Smartphone, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Avatar, Button, Chip, FormField } from '@/components/ui';
import { createStyles, colors, radius, spacing, type } from '@/constants/theme';
import { buildDateOfBirth, DOB_FORMAT_HINT, formatIndianMobile, normalizePhone, validateEmail } from '@/lib/format';
import type { UserProfile } from '@/types';

export const DAIRY_GOALS = [
  'Run a cleaner milk reception',
  'Sell milk and products',
  'Make paneer for sale',
  'Get a dairy unit compliant',
] as const;

type Draft = {
  name: string;
  email: string;
  day: string;
  month: string;
  year: string;
  city: string;
  goal: string;
};

function splitDob(iso: string | undefined): { day: string; month: string; year: string } {
  if (!iso) return { day: '', month: '', year: '' };
  const [year, month, day] = iso.split('-');
  return { day: String(Number(day) || ''), month: String(Number(month) || ''), year: year ?? '' };
}

function draftFrom(profile: UserProfile): Draft {
  const dob = splitDob(profile.dateOfBirth);
  return {
    name: profile.name ?? '',
    email: profile.email ?? '',
    city: profile.city ?? '',
    goal: profile.goal ?? '',
    ...dob,
  };
}

export function ProfileEditorSheet({
  visible,
  profile,
  avatarUri,
  saving,
  photoBusy,
  photoNotice,
  onClose,
  onPickPhoto,
  onRemovePhoto,
  onSave,
}: {
  visible: boolean;
  profile: UserProfile;
  avatarUri: string | null;
  saving: boolean;
  photoBusy: boolean;
  /** Set when the last photo pick failed (permission or unreadable file); shown next to the row. */
  photoNotice?: string | null;
  onClose: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onSave: (patch: Partial<UserProfile>) => void;
}) {
  const t = useT();

  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [touched, setTouched] = useState(false);

  // Re-open with what is actually stored, not with the last abandoned edit.
  useEffect(() => {
    if (visible) {
      setDraft(draftFrom(profile));
      setTouched(false);
    }
  }, [visible, profile]);

  const dob = useMemo(() => buildDateOfBirth(draft.day, draft.month, draft.year), [draft.day, draft.month, draft.year]);
  const nameError = draft.name.trim().length < 2 ? 'Add the name you want shown in the app.' : null;
  const emailError = validateEmail(draft.email);
  const dobError = dob.ok ? null : dob.error;
  const invalid = Boolean(nameError) || Boolean(emailError) || Boolean(dobError);

  const original = useMemo(() => draftFrom(profile), [profile]);
  const dirty =
    draft.name.trim() !== original.name.trim() ||
    draft.email.trim() !== original.email.trim() ||
    draft.city.trim() !== original.city.trim() ||
    draft.goal !== original.goal ||
    (dob.ok ? dob.date : '') !== (original.year && original.month && original.day
      ? `${original.year}-${original.month.padStart(2, '0')}-${original.day.padStart(2, '0')}`
      : '');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Edit profile")}
      subtitle={t("Everything here stays on this device. Nothing is sent to a server in this prototype.")}
      scrollable
      footer={
        <Button
          label={t("Save changes")}
          disabled={!dirty || invalid || saving}
          loading={saving}
          onPress={() => {
            setTouched(true);
            if (invalid) return;
            onSave({
              name: draft.name.trim(),
              email: draft.email.trim() || undefined,
              city: draft.city.trim() || undefined,
              goal: draft.goal || undefined,
              dateOfBirth: dob.ok ? dob.date : undefined,
            });
          }}
        />
      }>
      <View style={styles.photoRow}>
        <Avatar name={draft.name || profile.name} uri={avatarUri} size={64} />
        <View style={styles.photoActions}>
          <Button
            label={avatarUri ? 'Change photo' : 'Add photo'}
            variant="secondary"
            icon={Camera}
            fullWidth={false}
            loading={photoBusy}
            onPress={onPickPhoto}
          />
          {avatarUri ? (
            <Button label={t("Remove")} variant="ghost" icon={Trash2} fullWidth={false} onPress={onRemovePhoto} />
          ) : null}
        </View>
      </View>

      {photoNotice ? (
        <Text style={[type.label, styles.notice, { color: colors.error }]}>{photoNotice}</Text>
      ) : null}

      {/* Shown, not editable: the number the session was created with. */}
      <View style={styles.fieldWrap}>
        <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t('Mobile number')}</Text>
        <View style={styles.readOnly} accessibilityRole="text" accessibilityLabel={t('Mobile number')}>
          <Smartphone size={18} color={colors.textSubtle} strokeWidth={1.75} />
          <Text style={[type.body, styles.readOnlyValue, { color: colors.textMuted }]}>
            {formatIndianMobile(normalizePhone(profile.phone))}
          </Text>
        </View>
        <View style={styles.readOnlyNote}>
          <Info size={13} color={colors.textSubtle} strokeWidth={2} />
          <Text style={[type.label, styles.readOnlyNoteText, { color: colors.textSubtle }]}>
            {t('The number you signed in with cannot be changed here.')}
          </Text>
        </View>
      </View>

      <FormField
        label={t("Full name")}
        value={draft.name}
        onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
        onBlur={() => setTouched(true)}
        placeholder={t('Your name')}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        error={touched ? nameError : null}
      />

      <FormField
        label={t("Email")}
        value={draft.email}
        onChangeText={(email) => setDraft((prev) => ({ ...prev, email }))}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        hint={t("Used for receipts and course updates.")}
        error={emailError}
      />

      <View style={styles.fieldWrap}>
        <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("Date of birth")}</Text>
        <View style={styles.dobRow}>
          <FormField
            accessibilityLabel={t("Day of birth")}
            value={draft.day}
            onChangeText={(day) => setDraft((prev) => ({ ...prev, day }))}
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
            containerStyle={styles.dobField}
          />
          <FormField
            accessibilityLabel={t("Month of birth")}
            value={draft.month}
            onChangeText={(month) => setDraft((prev) => ({ ...prev, month }))}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            containerStyle={styles.dobField}
          />
          <FormField
            accessibilityLabel={t("Year of birth")}
            value={draft.year}
            onChangeText={(year) => setDraft((prev) => ({ ...prev, year }))}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
            containerStyle={styles.dobFieldWide}
          />
        </View>
        <Text style={[type.label, { color: dobError ? colors.error : colors.textSubtle }]}>
          {dobError ? t(dobError) : DOB_FORMAT_HINT}
        </Text>
      </View>

      <FormField
        label={t("City")}
        value={draft.city}
        onChangeText={(city) => setDraft((prev) => ({ ...prev, city }))}
        placeholder={t("Indore")}
        autoCapitalize="words"
        returnKeyType="done"
        hint={t("Helps us suggest products and tracks that fit your dairy.")}
      />

      <View style={styles.fieldWrap}>
        <Text style={[type.labelStrong, { color: colors.textMuted }]}>{t("Dairy goal")}</Text>
        <View style={styles.chips}>
          {DAIRY_GOALS.map((goal) => (
            <Chip
              key={goal}
              label={goal}
              selected={draft.goal === goal}
              onPress={() => setDraft((prev) => ({ ...prev, goal: prev.goal === goal ? '' : goal }))}
            />
          ))}
        </View>
        <Text style={[type.label, { color: colors.textSubtle }]}>{t("Optional. Tap again to clear.")}</Text>
      </View>
    </BottomSheet>
  );
}

const styles = createStyles(() => StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notice: { paddingTop: spacing.xs },
  photoActions: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldWrap: { gap: spacing.xs, marginTop: spacing.xs },
  dobRow: { flexDirection: 'row', gap: spacing.sm },
  dobField: { flex: 1 },
  dobFieldWide: { flex: 1.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  /** Read-only value: a soft block, not a field — nothing about it invites a tap. */
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  readOnlyValue: { flex: 1 },
  readOnlyNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  readOnlyNoteText: { flex: 1 },
}));
