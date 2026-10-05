/**
 * Authentication service boundary.
 *
 * There is no SMS provider configured, so the shipped implementation is the DEMO adapter:
 * - no message is sent anywhere, and the UI says so on both auth screens;
 * - the demo code is documented in the development README only, never in the app;
 * - a session token is stored in expo-secure-store (AsyncStorage on web, which has no
 *   secure store — noted in the README as a limitation).
 *
 * To go live: implement `AuthService` against your provider and swap the export at the
 * bottom of this file. Nothing else in the app needs to change.
 */

import * as SecureStore from 'expo-secure-store';
import { storage } from '@/lib/storage';
import { Platform } from 'react-native';

import type { Session } from '@/types';

const SESSION_KEY = 'rasoi.session';

export type OtpFailure = 'incorrect' | 'expired' | 'network';

export interface AuthService {
  requestOtp(phone: string): Promise<{ ok: true } | { ok: false; error: OtpFailure }>;
  verifyOtp(phone: string, code: string): Promise<{ ok: true; session: Session } | { ok: false; error: OtpFailure }>;
  getSession(): Promise<Session | null>;
  clearSession(): Promise<void>;
}

/** Demo constants. Documented in README; never logged. */
export const DEMO_OTP = '246810';
/** Requesting a code for this number simulates a provider/network failure, for state testing. */
export const DEMO_OFFLINE_PHONE = '9000000000';
const MAX_ATTEMPTS = 3;

async function readStored(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return storage.get(key);
  return SecureStore.getItemAsync(key);
}

async function writeStored(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await storage.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
}

async function deleteStored(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await storage.remove(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const attempts = new Map<string, number>();

/** ponytail: one process-local adapter, no SMS, no rate limiting — the backend owns both. */
export const authService: AuthService = {
  async requestOtp(phone) {
    await delay(900);
    attempts.set(phone, 0);
    if (phone === DEMO_OFFLINE_PHONE) {
      return { ok: false, error: 'network' };
    }
    return { ok: true };
  },

  async verifyOtp(phone, code) {
    await delay(1100);
    const tried = (attempts.get(phone) ?? 0) + 1;
    attempts.set(phone, tried);

    if (tried > MAX_ATTEMPTS) return { ok: false, error: 'expired' };
    if (code !== DEMO_OTP) return { ok: false, error: 'incorrect' };

    attempts.delete(phone);
    const session: Session = {
      // Not a credential: a locally minted demo token so the session flow is exercised end to end.
      token: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      profile: {
        id: `demo-${phone.slice(-4)}`,
        name: 'Deepak',
        phone,
        joinedAt: new Date().toISOString(),
      },
    };
    await writeStored(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  },

  async getSession() {
    const raw = await readStored(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  },

  async clearSession() {
    await deleteStored(SESSION_KEY);
  },
};
