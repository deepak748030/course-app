/**
 * Sign in / create account — email + password against the YDU Academy server.
 *
 * Replaces the old phone-OTP demo: accounts live on the server, so enrollments and
 * progress follow the learner across devices. After sign-in the learner picks interests.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandMark } from '@/components/marks';
import { AppBar, Button, ErrorState, FormField, Screen } from '@/components/ui';
import { createStyles, colors, layout, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import { validateEmail } from '@/lib/format';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';
import { useStore } from '@/store';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, signIn } = useStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailOk = validateEmail(email.trim());
  const canSubmit =
    !busy && emailOk && password.length >= 6 && (mode === 'signin' || name.trim().length >= 2);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding');
  };

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setOffline(false);
    try {
      const session =
        mode === 'signin'
          ? await authService.signIn(email.trim(), password)
          : await authService.signUp(name.trim(), email.trim(), password);
      signIn(session);
      // Interests only need picking once; returning learners skip straight to Home.
      router.replace(state.interests.length > 0 ? '/home' : '/auth/interests');
    } catch (err) {
      if (err instanceof ApiError && err.isOffline) setOffline(true);
      else setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        scroll={false}
        header={<AppBar title={mode === 'signin' ? t('Sign in') : t('Create account')} onBack={goBack} borderless />}
        contentStyle={{ overflow: 'hidden', paddingBottom: insets.bottom + spacing.md, paddingHorizontal: 0 }}>
        <ScrollView
          style={styles.scrollClip}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <BrandMark size={40} />
            <Text style={[type.title, { color: colors.text }]}>
              {mode === 'signin' ? t('Welcome back') : t('Create your account')}
            </Text>
            <Text style={[type.body, { color: colors.textMuted }]}>
              {mode === 'signin'
                ? t('Sign in to see your courses, progress and purchases — they live on your account.')
                : t('Your courses, progress and purchases stay on your account, on every device.')}
            </Text>
          </View>

          {mode === 'signup' ? (
            <FormField
              nativeID="name"
              label={t('Full name')}
              icon={User}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              placeholder="Asha Verma"
              textContentType="name"
              autoComplete="name"
              maxLength={80}
              autoFocus
              returnKeyType="next"
              editable={!busy}
            />
          ) : null}

          <FormField
            nativeID="email"
            label={t('Email')}
            icon={Mail}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
              if (offline) setOffline(false);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={120}
            autoFocus={mode === 'signin'}
            error={email.length > 0 && !emailOk ? t('Enter a valid email address.') : undefined}
            returnKeyType="next"
            editable={!busy}
          />

          <FormField
            nativeID="password"
            label={t('Password')}
            icon={Lock}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
              if (offline) setOffline(false);
            }}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'password'}
            maxLength={128}
            hint={mode === 'signup' ? t('At least 6 characters.') : undefined}
            returnKeyType="done"
            onSubmitEditing={submit}
            editable={!busy}
            rightSlot={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('Hide password') : t('Show password')}
                onPress={() => setShowPassword((value) => !value)}
                hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSubtle} strokeWidth={1.75} />
                ) : (
                  <Eye size={18} color={colors.textSubtle} strokeWidth={1.75} />
                )}
              </Pressable>
            }
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={[type.labelStrong, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={mode === 'signin' ? t('Sign in') : t('Create account')}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />

          {offline ? (
            <ErrorState
              offline
              title={t('We could not reach the server')}
              body={t('Check your connection and try again. Nothing has been saved.')}
              onRetry={submit}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setMode((current) => (current === 'signin' ? 'signup' : 'signin'))}
            style={({ pressed }) => [styles.switchMode, pressed && { opacity: 0.6 }]}>
            <Text style={[type.labelStrong, { color: colors.accentText }]}>
              {mode === 'signin'
                ? t('New here? Create an account')
                : t('Already have an account? Sign in')}
            </Text>
          </Pressable>

          <View style={styles.notice}>
            <ShieldCheck size={16} color={colors.sage} strokeWidth={1.9} />
            <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
              {t('Your learning data stays with your account on the academy server. Sign out any time — nothing is lost.')}
            </Text>
          </View>

          <Text style={[type.label, { color: colors.textMuted }]}>
            {t('By continuing you agree to our')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
              style={styles.link}>
              {t('Terms of use')}
            </Text>{' '}
            {t('and')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
              style={styles.link}>
              {t('Privacy policy')}
            </Text>
            .
          </Text>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scrollClip: { flex: 1 },
    content: {
      paddingHorizontal: layout.screen,
      paddingTop: spacing.sm,
      gap: spacing.lg,
      width: '100%',
      maxWidth: layout.maxWidth,
      alignSelf: 'center',
      flexGrow: 1,
    },
    intro: { gap: spacing.sm, paddingHorizontal: spacing.sm },
    errorBox: {
      backgroundColor: colors.errorSoft,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    switchMode: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      minHeight: layout.touchTarget,
      justifyContent: 'center',
    },
    notice: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: colors.sageSoft,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    link: { color: colors.accentText, textDecorationLine: 'underline' },
  }),
);
