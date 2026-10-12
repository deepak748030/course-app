/**
 * Push notifications on the device.
 *
 * - `syncPushToken` gets this phone's Expo push token (asking for permission the first time) and
 *   registers it with the academy server for the signed-in learner. It runs on sign-in, on every
 *   return to the app, and whenever the operating system rotates the token, so the server always has
 *   the current one. The previous token is removed when it changes.
 * - `forgetPushToken` removes this phone from the account before the session is cleared, so a shared
 *   phone stops receiving the previous learner's messages.
 * - `useNotificationTaps` opens the course (or the inbox) a learner taps on.
 *
 * A push only reaches a phone built with EAS (development or store build), not Expo Go. The Expo
 * project id comes from app.json (`extra.eas.projectId`) or EXPO_PUBLIC_EAS_PROJECT_ID.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { storage } from '@/lib/storage';
import { api } from '@/services/api';

const TOKEN_KEY = 'ydu.pushToken';

// Show a banner and play the sound while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'YDU Academy',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#14532D',
  });
}

/** This device's Expo push token, or null when it cannot receive pushes (simulator, denied, no project id). */
async function currentToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const id = projectId();
  if (!id) {
    console.warn('[push] no Expo project id: set EXPO_PUBLIC_EAS_PROJECT_ID or extra.eas.projectId');
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return data;
}

/** Registers (or refreshes) this device for the signed-in learner. Never throws: it is best-effort. */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await currentToken();
    if (!token) return;
    const previous = await storage.get(TOKEN_KEY);
    const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown';
    await api.registerPushToken({ token, platform });
    if (previous && previous !== token) await api.unregisterPushToken(previous).catch(() => {});
    await storage.set(TOKEN_KEY, token);
  } catch (err) {
    console.warn('[push] could not register this device', err);
  }
}

/** Removes this device from the account. Call while the session is still valid. */
export async function forgetPushToken(): Promise<void> {
  try {
    const token = await storage.get(TOKEN_KEY);
    if (!token) return;
    await api.unregisterPushToken(token).catch(() => {});
    await storage.remove(TOKEN_KEY);
  } catch {
    /* nothing to undo */
  }
}

/** Keeps the server current when the operating system hands the phone a new token. */
export function watchPushTokenChanges(onChange: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => onChange());
  return () => subscription.remove();
}

export type TapTarget = { courseId?: string | null };

/** Opens what a learner tapped: the course when the message names one, otherwise the inbox. */
export function useNotificationTaps(onTap: (target: TapTarget) => void) {
  // Always the latest handler, so a tap never runs with a stale closure.
  const handler = useRef(onTap);
  handler.current = onTap;

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as { courseId?: string } | undefined;
      handler.current({ courseId: data?.courseId ?? null });
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    // A tap that launched the app from closed.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    return () => subscription.remove();
  }, []);
}
