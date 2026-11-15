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
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsApi from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { apiUrl } from '@/lib/serverUrl';
import { storage } from '@/lib/storage';
import { api } from '@/services/api';

const TOKEN_KEY = 'ydu.pushToken';
/** Persistent flag (like `onboardingDone`) so the OS permission dialog is only requested once. */
const PUSH_PROMPTED_KEY = 'ydu.pushPrompted';

type StoredPushRegistration = {
  token: string;
  userId: string;
  serverUrl: string;
};

let inFlightSync: Promise<void> | null = null;

async function readStoredRegistration(): Promise<StoredPushRegistration | null> {
  const raw = await storage.get(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushRegistration>;
    if (typeof parsed?.token === 'string' && parsed.token) {
      return {
        token: parsed.token,
        userId: typeof parsed.userId === 'string' ? parsed.userId : '',
        serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : '',
      };
    }
  } catch {
    // Legacy plain-string token stored by an older build.
    return { token: raw, userId: '', serverUrl: '' };
  }
  return null;
}

/**
 * expo-notifications cannot load in Expo Go on Android (SDK 53+): its remote-push module throws the
 * moment it is imported. So it is loaded only where it works, and push quietly stays off in Expo Go;
 * the app itself runs normally there. Development and store builds get the real module.
 */
function loadNotifications(): typeof NotificationsApi | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require('expo-notifications') as typeof NotificationsApi;
  } catch {
    return null;
  }
}

const Notifications = loadNotifications();

// Show a banner and play the sound while the app is open too.
Notifications?.setNotificationHandler({
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
  if (!Notifications || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'YDU Academy',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#14532D',
  });
}

/** This device's Expo push token, or null when it cannot receive pushes (simulator, denied, no project id). */
async function currentToken(): Promise<string | null> {
  if (!Notifications || !Device.isDevice) return null;
  await ensureAndroidChannel();
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') {
    // Ask the user at most once across installs (same pattern as `onboardingDone`).
    const alreadyPrompted = await storage.get(PUSH_PROMPTED_KEY);
    if (alreadyPrompted === '1' || !permission.canAskAgain) return null;
    await storage.set(PUSH_PROMPTED_KEY, '1');
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;
  const id = projectId();
  if (!id) {
    console.warn('[push] no Expo project id: set EXPO_PUBLIC_EAS_PROJECT_ID or extra.eas.projectId');
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return data;
}

/**
 * Registers this device once for the signed-in learner and persists the registration on-device
 * (just like `onboardingDone`), so subsequent app launches and foreground transitions make zero
 * redundant `/api/notifications/push-token` requests unless the token, account, or server changes.
 */
export async function syncPushToken(userId?: string | null, force = false): Promise<void> {
  if (!userId) return;
  if (inFlightSync) return inFlightSync;
  inFlightSync = (async () => {
    try {
      const currentServer = apiUrl();
      const previous = await readStoredRegistration();

      // Fast path: if already registered for this user + server and not forced by OS token rotation,
      // skip native token lookup and network call completely.
      if (
        !force &&
        previous &&
        previous.userId === userId &&
        previous.serverUrl === currentServer &&
        previous.token
      ) {
        return;
      }

      const token = await currentToken();
      if (!token) return;

      if (
        !force &&
        previous &&
        previous.token === token &&
        previous.userId === userId &&
        previous.serverUrl === currentServer
      ) {
        return;
      }

      const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown';
      await api.registerPushToken({ token, platform });
      if (previous?.token && previous.token !== token) {
        await api.unregisterPushToken(previous.token).catch(() => {});
      }
      await storage.set(
        TOKEN_KEY,
        JSON.stringify({ token, userId, serverUrl: currentServer } satisfies StoredPushRegistration),
      );
    } catch (err) {
      console.warn('[push] could not register this device', err);
    } finally {
      inFlightSync = null;
    }
  })();
  return inFlightSync;
}

/** Removes this device from the account. Call while the session is still valid. */
export async function forgetPushToken(): Promise<void> {
  try {
    const previous = await readStoredRegistration();
    if (!previous?.token) return;
    await api.unregisterPushToken(previous.token).catch(() => {});
    await storage.remove(TOKEN_KEY);
  } catch {
    /* nothing to undo */
  }
}

/** Keeps the server current when the operating system hands the phone a new token. */
export function watchPushTokenChanges(onChange: () => void): () => void {
  if (!Notifications) return () => {};
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
    if (!Notifications) return;
    const open = (response: NotificationsApi.NotificationResponse | null) => {
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
