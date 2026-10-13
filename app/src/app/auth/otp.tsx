import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar, Button, ErrorState, Screen, scrollClip } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { formatIndianMobile } from '@/lib/format';
import { feedback } from '@/lib/util';
import { authService, type OtpFailure } from '@/services/auth';
import { useStore } from '@/store';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

/**
 * Single accessible input, six visual cells. The real TextInput is one field (so paste and
 * SMS autofill work) and is visually hidden behind the cells.
 */
export default function OtpScreen() {
  const t = useT();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn, restoreInterests, state } = useStore();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<{ kind: OtpFailure; message: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const autoSubmitted = useRef<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const announce = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const verify = useCallback(
    async (value: string) => {
      if (verifying) return;
      setVerifying(true);
      setError(null);
      const result = await authService.verifyOtp(phone ?? '', value);
      setVerifying(false);

      if (result.ok) {
        signIn(result.session);
        feedback.success();
        restoreInterests(result.interests);
        // The "what do you work with" step is asked once: after a choice (here or on another device) it never returns.
        // "Maybe later" saves nothing, so it is asked again on the next sign-in.
        const hasChoice = result.interests.length > 0 || state.interests.length > 0;
        router.replace(hasChoice ? '/home' : '/auth/interests');
        return;
      }

      feedback.error();
      const messages: Record<OtpFailure, string> = {
        incorrect: t('That code is not correct. Check the last message and try again.'),
        expired: t('This code has expired after three attempts. Request a new one.'),
        blocked: t('This account has been blocked by the academy, so it cannot be used to sign in. Contact support for help.'),
        network: t('We could not verify the code because the connection dropped. Try again.'),
      };
      setError({ kind: result.error, message: messages[result.error] });
      announce(messages[result.error]);
      if (result.error !== 'network' && result.error !== 'blocked') setCode('');
    },
    [announce, phone, restoreInterests, router, signIn, state.interests, verifying],
  );

  // Auto-verify once a complete code is entered — expected on OTP screens, still reversible.
  useEffect(() => {
    if (code.length === CODE_LENGTH && autoSubmitted.current !== code && !verifying && error?.kind !== 'expired') {
      autoSubmitted.current = code;
      void verify(code);
    }
  }, [code, error?.kind, verify, verifying]);

  const resend = async () => {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setError(null);
    const result = await authService.requestOtp(phone ?? '');
    setResending(false);

    if (!result.ok) {
      setError({ kind: 'network', message: 'We could not send a new code. Check your connection and try again.' });
      announce('We could not send a new code.');
      return;
    }
    setCode('');
    autoSubmitted.current = null;
    setSecondsLeft(RESEND_SECONDS);
    announce('A new code has been sent.');
  };

  const changeNumber = () => router.replace('/auth/phone');

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        scroll={false}
        header={<AppBar title={t("Verify number")} onBack={changeNumber} backLabel="Back to mobile number" borderless />}
        /* The scroller's parent clips it: on Android a ScrollView can draw its content past its
            own edges, and the code row would ride up over the app bar while scrolling. */
        contentStyle={{ overflow: 'hidden', paddingHorizontal: 0, paddingBottom: insets.bottom + spacing.md }}>
        <ScrollView
          style={scrollClip}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={[type.title, { color: colors.text }]}>{t("Enter the 6-digit code")}</Text>
            <Text style={[type.body, tabularNums, { color: colors.textMuted }]}>
              Sent to {formatIndianMobile(phone ?? '')}
            </Text>
          </View>

          <Pressable
            accessibilityRole="none"
            onPress={() => inputRef.current?.focus()}
            style={styles.cellsRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const digit = code[index] ?? '';
              const isActive = index === Math.min(code.length, CODE_LENGTH - 1) && !error;
              return (
                <View
                  key={index}
                  style={[
                    styles.cell,
                    isActive && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    error && { borderColor: colors.error },
                  ]}>
                  <Text style={[type.title, tabularNums, { color: colors.text }]}>{digit}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH));
              if (error) setError(null);
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={CODE_LENGTH}
            autoFocus
            editable={!verifying && error?.kind !== 'expired' && error?.kind !== 'blocked'}
            accessibilityLabel={`One-time code, 6 digits, sent to ${formatIndianMobile(phone ?? '')}`}
            style={styles.hiddenInput}
          />

          {error ? (
            <View accessibilityLiveRegion="polite">
              <ErrorState
                title={
                  error.kind === 'expired'
                    ? 'Code expired'
                    : error.kind === 'blocked'
                      ? 'Account blocked'
                      : error.kind === 'network'
                        ? 'Connection problem'
                        : 'Incorrect code'
                }
                body={error.message}
                offline={error.kind === 'network'}
                onRetry={error.kind === 'expired' ? resend : error.kind === 'blocked' ? undefined : () => verify(code)}
              />
            </View>
          ) : null}

          <Button
            label={t("Verify and continue")}
            onPress={() => verify(code)}
            loading={verifying}
            disabled={code.length !== CODE_LENGTH || error?.kind === 'expired' || error?.kind === 'blocked'}
            accessibilityHint={t("Verifies the code and continues to the app")}
          />

          <View style={styles.resendRow}>
            <Text style={[type.label, tabularNums, { color: colors.textMuted }]}>
              {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Did not get the code?'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Resend code")}
              accessibilityState={{ disabled: secondsLeft > 0 || resending }}
              disabled={secondsLeft > 0 || resending}
              onPress={resend}
              hitSlop={8}>
              <Text
                style={[
                  type.labelStrong,
                  { color: secondsLeft > 0 || resending ? colors.textSubtle : colors.accentText },
                ]}>
                {resending ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Change mobile number")}
            onPress={changeNumber}
            hitSlop={8}
            style={styles.changeLink}>
            <Text style={[type.labelStrong, { color: colors.accentText }]}>{t("Change number")}</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screen,
    paddingTop: spacing.sm,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  intro: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  cellsRow: { flexDirection: 'row', gap: layout.gap, justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Visually hidden, but keeps paste and one-time-code autofill working. */
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  changeLink: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm },
}));
