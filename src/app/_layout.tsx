import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStatusBar, applyAndroidStatusBar, StatusBarBackdrop, StatusBarToneProvider } from '@/components/app-status-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { colors, font } from '@/constants/theme';
import { StoreProvider, useStore } from '@/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Runs before React mounts, because both of these are visible in the very first frame: on a
// non-edge-to-edge Android window the status bar itself has to be painted, and on an edge-to-edge
// one the decor view behind the transparent bar is what shows.
applyAndroidStatusBar('light');
if (Platform.OS !== 'web') {
  void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
}

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

/** Some hosts repaint the window on resume, so the colour is re-applied on every foreground. */
function useThemedWindow() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const apply = () => {
      void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
      applyAndroidStatusBar('light');
    };
    apply();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') apply();
    });
    return () => subscription.remove();
  }, []);
}

function SplashGate({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  useThemedWindow();

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
                  <StatusBarToneProvider>
                    <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                    }}>
                    <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    </Stack>
                    {/* Dark icons on the white window; the strip behind the bar is painted in-app. */}
                    <AppStatusBar />
                    <StatusBarBackdrop />
                  </StatusBarToneProvider>
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
