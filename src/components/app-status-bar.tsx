/**
 * Status bar handling for a light-only app on Android's enforced edge-to-edge mode.
 *
 * With edge-to-edge the status bar is transparent and cannot be coloured from JS — whatever sits
 * behind it is what the user sees. Two layers make sure that is always the app background instead
 * of the Android window default (which reads as a black bar):
 *
 * 1. the window / decor view background is set to the app background in the root layout through
 *    expo-system-ui, plus the matching config keys in app.json;
 * 2. this component's `<StatusBarBackdrop>` paints the app background itself across the safe-area
 *    strip, so even a host that ignores the window colour (Expo Go) shows white behind the bar.
 *
 * Screens whose top is dark — the lesson player and the course hero — switch the strip off with
 * `<AppStatusBar style="light" />` and keep light icons over their own surface.
 */

import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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

/** The coloured strip behind the status bar. Rendered once, above the navigator. */
export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const { tone } = useContext(ToneContext);

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
