/**
 * Status bar handling.
 *
 * There are two Android worlds and both have to be covered, because the black bar came from
 * whichever one the device is in:
 *
 * 1. NOT edge-to-edge (Android 14 and older — the common case in the field, and what Expo Go
 *    does when the platform does not force edge-to-edge). The status bar is an opaque system bar
 *    and its untouched colour is black. `app.json` cannot help here: `androidStatusBar` is baked
 *    into the host manifest, so Expo Go ignores it, and the only working lever is
 *    `StatusBar.setBackgroundColor`, which React Native applies straight to the window.
 * 2. Edge-to-edge (Android 15+ with `enableEdgeToEdge`, where RN ignores the colour by design —
 *    see StatusBarModule.kt "Ignored status bar change, current activity is edge-to-edge"). The
 *    bar is transparent there, so whatever is behind it wins: the decor view colour set through
 *    expo-system-ui in the root layout, plus the strip `<StatusBarBackdrop>` paints itself.
 *
 * Layer 2 did nothing on a non-edge-to-edge device: the safe-area top inset is 0 there, so the
 * strip had no height and the opaque bar stayed black. Layer 1 is what fixes that, and it is
 * applied at startup, on every tone change and on every foreground.
 *
 * Screens whose top is dark — the lesson player and the course hero — switch the strip off with
 * `<AppStatusBar style="light" />`, which also turns the native bar dark so light icons stay
 * legible instead of vanishing into a white bar.
 */

import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

/** `light` = light surface behind the bar (dark icons); `dark` = dark surface (light icons). */
type Tone = 'light' | 'dark';

const ToneContext = createContext<{ tone: Tone; setTone: (tone: Tone) => void }>({
  tone: 'light',
  setTone: () => {},
});

export function StatusBarToneProvider({ children }: { children: ReactNode }) {
  const [tone, setTone] = useState<Tone>('light');
  const value = useMemo(() => ({ tone, setTone }), [tone]);
  return <ToneContext.Provider value={value}>{children}</ToneContext.Provider>;
}

/**
 * Colours the Android status bar itself. No-op on web and iOS, and on edge-to-edge Android (where
 * React Native logs and ignores it) the strip below is the visible layer instead.
 */
export function applyAndroidStatusBar(tone: Tone) {
  if (Platform.OS !== 'android') return;
  NativeStatusBar.setBarStyle(tone === 'light' ? 'dark-content' : 'light-content');
  NativeStatusBar.setTranslucent(false);
  NativeStatusBar.setBackgroundColor(tone === 'light' ? colors.background : colors.player);
}

/** The coloured strip behind the status bar. Rendered once, above the navigator. */
export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const { tone } = useContext(ToneContext);

  // Every tone change repaints the native bar too, and a foreground re-applies it: some hosts
  // reset the window when the app comes back from the background.
  useEffect(() => {
    applyAndroidStatusBar(tone);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') applyAndroidStatusBar(tone);
    });
    return () => subscription.remove();
  }, [tone]);

  if (insets.top <= 0) return null;

  return (
    <View
      style={[
        styles.backdrop,
        { height: insets.top, backgroundColor: tone === 'light' ? colors.background : 'transparent' },
      ]}
    />
  );
}

/** Status bar for light surfaces (default) or dark ones (`style="light"`). */
export function AppStatusBar({ style = 'dark' }: { style?: 'dark' | 'light' }) {
  const { setTone } = useContext(ToneContext);

  useEffect(() => {
    setTone(style === 'light' ? 'dark' : 'light');
    return () => setTone('light');
  }, [setTone, style]);

  return <StatusBar style={style} />;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
});
