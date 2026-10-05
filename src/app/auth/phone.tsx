import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/marks';
import { ErrorState, FormField, IconButton, PrimaryButton } from '@/components/ui';
import { colors, maxContentWidth, screenPadding, spacing, type } from '@/constants/theme';
import { normalizePhone, validateIndianMobile } from '@/lib/format';
import { feedback } from '@/lib/util';
import { DEMO_OFFLINE_PHONE, authService } from '@/services/auth';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [sending, setSending] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding');
  };

  const submit = async () => {
    const validation = validateIndianMobile(digits);
    if (validation) {
      setError(validation);
      feedback.error();
      return;
    }
    setError(null);
    setNetworkError(false);
    setSending(true);
    const result = await authService.requestOtp(digits);
    setSending(false);

    if (!result.ok) {
      setNetworkError(true);
      feedback.error();
      return;
    }
    router.push({ pathname: '/auth/otp', params: { phone: digits } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon={ArrowLeft} onPress={goBack} accessibilityLabel="Go back" />
        </View>

        <View style={styles.intro}>
          <BrandMark size={44} />
          <Text style={[type.screenTitle, { color: colors.text }]}>What is your mobile number?</Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            We will use it to keep your courses, progress and notes on your account. No marketing calls, ever.
          </Text>
        </View>

        <FormField
          nativeID="phone"
          label="Mobile number"
          prefix="+91"
          value={digits}
          onChangeText={(text) => {
            setDigits(normalizePhone(text));
            if (error) setError(null);
            if (networkError) setNetworkError(false);
          }}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          inputMode="tel"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={10}
          autoFocus
          error={error}
          hint="India only. 10 digits, starting with 6, 7, 8 or 9."
          returnKeyType="done"
          onSubmitEditing={submit}
          editable={!sending}
        />

        <PrimaryButton
          label={sending ? 'Sending code' : 'Get OTP'}
          onPress={submit}
          iconRight={sending ? undefined : ArrowRight}
          loading={sending}
          disabled={digits.length !== 10}
          accessibilityHint="Sends a one-time code to this number"
        />

        {networkError ? (
          <ErrorState
            offline
            title="We could not reach the server"
            body={
              digits === DEMO_OFFLINE_PHONE
                ? 'This number is reserved in the demo to simulate a failed request. Try any other 10-digit number.'
                : 'Check your connection and try again. Your number has not been saved.'
            }
            onRetry={submit}
          />
        ) : null}

        <View style={styles.demoNotice}>
          <ShieldCheck size={16} color={colors.sage} strokeWidth={1.9} />
          <Text style={[type.supporting, { color: colors.textSecondary, flex: 1 }]}>
            Demo build: no SMS is sent and no real account is created. The demo verification code is documented in the
            project README.
          </Text>
        </View>

        <Text style={[type.meta, { color: colors.textSecondary }]}>
          By continuing you agree to our{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
            style={styles.link}>
            Terms of use
          </Text>{' '}
          and{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
            style={styles.link}>
            Privacy policy
          </Text>
          .
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Why we ask for your number"
          onPress={() => router.push('/help')}
          style={styles.helpLink}>
          <Text style={[type.label, { color: colors.primary }]}>Why do you need this?</Text>
        </Pressable>
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
  intro: { gap: spacing.sm, marginTop: spacing.sm },
  demoNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.sageSoft,
    borderRadius: 14,
    padding: spacing.sm,
  },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  helpLink: { alignSelf: 'flex-start' },
});
