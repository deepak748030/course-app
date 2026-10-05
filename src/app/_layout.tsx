import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { colors, font } from '@/constants/theme';
import { StoreProvider, useStore } from '@/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * The app renders immediately — nothing is gated behind an await.
 *
 * Fonts are registered in the background (the system sans shows until DM Sans is ready) and
 * the native splash is released as soon as local state has hydrated, and never later than
 * SPLASH_MAX_MS. An earlier version returned an empty view until fonts *and* storage both
 * resolved, which meant a blocked localStorage in a cross-origin preview frame, or a stalled
 * font request, left every screen blank. Storage calls are now bounded too (see @/lib/storage).
 */
const SPLASH_MAX_MS = 1600;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accentText,
  },
};

function hideSplash() {
  void SplashScreen.hideAsync().catch(() => {});
}

function SplashGate({ children }: { children: ReactNode }) {
  const { ready } = useStore();

  useEffect(() => {
    if (ready) hideSplash();
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  // Bundled locally, two weights only. Not awaited: failing to load them degrades the
  // typeface, it never blocks the app.
  useFonts({
    [font.regular]: DMSans_400Regular,
    [font.semibold]: DMSans_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StoreProvider>
            <ErrorBoundary>
              <SplashGate>
                <View style={styles.flex}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                    }}>
                    <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                  </Stack>
                  <StatusBar style="dark" />
                </View>
              </SplashGate>
            </ErrorBoundary>
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
});
