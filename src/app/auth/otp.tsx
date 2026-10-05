import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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

import { ErrorState, IconButton, PrimaryButton } from '@/components/ui';
import { colors, maxContentWidth, radius, screenPadding, spacing, type } from '@/constants/theme';
import { formatIndianMobile } from '@/lib/format';
import { feedback } from '@/lib/util';
import { authService, type OtpFailure } from '@/services/auth';
import { useStore } from '@/store';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useStore();

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
        router.replace('/auth/interests');
        return;
      }

      feedback.error();
      const messages: Record<OtpFailure, string> = {
        incorrect: 'That code is not correct. Check the last message and try again.',
        expired: 'This code has expired after three attempts. Request a new one.',
        network: 'We could not verify the code because the connection dropped. Try again.',
      };
      setError({ kind: result.error, message: messages[result.error] });
      announce(messages[result.error]);
      if (result.error !== 'network') setCode('');
    },
    [announce, phone, router, signIn, verifying],
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
    announce('A new demo code has been generated.');
  };

  const changeNumber = () => router.replace('/auth/phone');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon={ArrowLeft} onPress={changeNumber} accessibilityLabel="Back to mobile number" />
        </View>

        <View style={styles.intro}>
          <Text style={[type.screenTitle, { color: colors.text }]}>Enter the 6-digit code</Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Sent to {formatIndianMobile(phone ?? '')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="none"
          onPress={() => inputRef.current?.focus()}
          style={styles.cellsRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
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
                <Text style={[type.screenTitle, { color: colors.text, fontSize: 24, lineHeight: 30 }]}>{digit}</Text>
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
          editable={!verifying && error?.kind !== 'expired'}
          accessibilityLabel={`One-time code, 6 digits, sent to ${formatIndianMobile(phone ?? '')}`}
          style={styles.hiddenInput}
        />

        {error ? (
          <View style={styles.errorBlock} accessibilityLiveRegion="polite">
            <ErrorState
              title={error.kind === 'expired' ? 'Code expired' : error.kind === 'network' ? 'Connection problem' : 'Incorrect code'}
              body={error.message}
              offline={error.kind === 'network'}
              onRetry={error.kind === 'expired' ? resend : () => verify(code)}
            />
          </View>
        ) : null}

        <PrimaryButton
          label="Verify and continue"
          onPress={() => verify(code)}
          loading={verifying}
          disabled={code.length !== CODE_LENGTH || error?.kind === 'expired'}
          accessibilityHint="Verifies the code and continues to the app"
        />

        <View style={styles.resendRow}>
          <Text style={[type.supporting, { color: colors.textSecondary }]}>
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Did not get the code?'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resend code"
            accessibilityState={{ disabled: secondsLeft > 0 || resending }}
            disabled={secondsLeft > 0 || resending}
            onPress={resend}
            hitSlop={8}>
            <Text style={[type.label, { color: secondsLeft > 0 || resending ? colors.textSecondary : colors.primary }]}>
              {resending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Change mobile number" onPress={changeNumber} hitSlop={8}>
          <Text style={[type.label, { color: colors.primary }]}>Change number</Text>
        </Pressable>

        <Text style={[type.meta, { color: colors.textSecondary }]}>
          Demo build: this code is generated locally, never sent by SMS, and never written to a log. The demo code is in
          the project README.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: screenPadding,
    gap: spacing.lg,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  intro: { gap: spacing.xs, marginTop: spacing.sm },
  cellsRow: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Visually hidden, but keeps paste and one-time-code autofill working. */
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  errorBlock: { marginTop: -spacing.sm },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
});
