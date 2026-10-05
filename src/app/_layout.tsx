import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, font } from '@/constants/theme';
import { StoreProvider, useStore } from '@/store';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

/** Loading gate: the native splash stays up until fonts and local state are ready. */
function Bootstrap({ children }: { children: ReactNode }) {
  const { ready } = useStore();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={styles.boot} />;
  return <>{children}</>;
}

export default function RootLayout() {
  // One family, two weights — bundled locally, no network request at launch.
  const [fontsLoaded, fontError] = useFonts({
    [font.regular]: DMSans_400Regular,
    [font.semibold]: DMSans_600SemiBold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StoreProvider>
            {!fontsReady ? (
              <View style={styles.boot} />
            ) : (
              <Bootstrap>
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
              </Bootstrap>
            )}
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, backgroundColor: colors.background },
});
