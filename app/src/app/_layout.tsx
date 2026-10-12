import * as ScreenOrientation from 'expo-screen-orientation';
import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStatusBar, applyAndroidStatusBar, StatusBarBackdrop, StatusBarToneProvider } from '@/components/app-status-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServiceGate } from '@/components/service-gate';
import { createStyles, colors, font, setActiveTheme } from '@/constants/theme';
import { startAnalytics, track } from '@/services/analytics';
import { CatalogProvider } from '@/services/catalog-context';
import { StoreProvider, useStore } from '@/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Behaviour analytics: one 'app_opened' per launch, batched flushes after that.
// Fire-and-forget — offline launches just queue until the server is reachable.
startAnalytics();
track('app_opened');

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

const BASE_NAVIGATION_THEME = DefaultTheme;

function hideSplash() {
  void SplashScreen.hideAsync().catch(() => {});
}

/**
 * Applies the theme the user picked on Profile to the whole tree.
 *
 * `setActiveTheme` runs during render, before any child renders, so the live `colors` proxy and
 * every `createStyles` factory below resolve against the picked palette, and the navigation theme
 * is rebuilt here (a module-scope object would have kept the palette of the first launch).
 *
 * The `<Fragment key>` is the part that makes the switch complete: it mounts the tree again, and a
 * fresh mount is what re-resolves every style. Re-rendering alone is not enough, because a
 * component that is not re-rendered keeps the style objects it already holds, and a palette read
 * through a module-level proxy is invisible to the React Compiler, which is therefore free to
 * reuse the elements it built for the previous theme. Remounting below the navigation container
 * keeps the current route and tab — the navigation state lives in the container, above this.
 */
function ThemedApp({ children }: { children: ReactNode }) {
  const { state } = useStore();
  setActiveTheme(state.theme);

  const navigationTheme = useMemo(
    () => ({
      ...BASE_NAVIGATION_THEME,
      colors: {
        ...BASE_NAVIGATION_THEME.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accentText,
      },
    }),
    // `colors` is a live proxy: the id is what actually changes the values read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.theme],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      {/* The key is the switch itself: mount the tree again and every style is resolved afresh. */}
      <Fragment key={state.theme}>{children}</Fragment>
    </ThemeProvider>
  );
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

/** The app stays portrait; only the lesson player's fullscreen may rotate the screen. */
function usePortraitLock() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);
}

export default function RootLayout() {
  usePortraitLock();
  // Bundled locally, two weights only. Not awaited: failing to load them degrades the
  // typeface, it never blocks the app.
  useFonts({
    [font.regular]: DMSans_400Regular,
    [font.semibold]: DMSans_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StoreProvider>
          <CatalogProvider>
          <ThemedApp>
            <ErrorBoundary>
              <SplashGate>
                <View style={styles.flex}>
                  <StatusBarToneProvider>
                    {/* Maintenance and update-required replace the whole app; see service-gate.tsx. */}
                    <ServiceGate>
                      <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                      }}>
                      <Stack.Screen name="index" options={{ animation: 'fade' }} />
                      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                      </Stack>
                    </ServiceGate>
                    {/* Dark icons on the white window; the strip behind the bar is painted in-app. */}
                    <AppStatusBar />
                    <StatusBarBackdrop />
                  </StatusBarToneProvider>
                </View>
              </SplashGate>
            </ErrorBoundary>
          </ThemedApp>
          </CatalogProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = createStyles(() => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
}));
