/**
 * Authentication service — phone number + one-time code against the YDU Academy server.
 *
 * The learner types a +91 mobile number, the server sends a six-digit code (see
 * server/src/services/sms.js for the SMS hook), and the code signs them in. The session
 * token is stored in expo-secure-store (AsyncStorage on web, which has no secure store —
 * noted in the README as a limitation). The same token is injected into the API client and
 * the realtime socket, so one sign-in covers REST and socket.io.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { storage } from '@/lib/storage';
import { ApiError, api, setApiToken, type ServerUser } from '@/services/api';

import type { Session } from '@/types';

const SESSION_KEY = 'ydu.session';

/** Why a code could not be checked. The OTP screen words each one differently. */
export type OtpFailure = 'incorrect' | 'expired' | 'blocked' | 'network';

export interface AuthService {
  requestOtp(phone: string): Promise<{ ok: true } | { ok: false; error: OtpFailure }>;
  verifyOtp(phone: string, code: string): Promise<{ ok: true; session: Session } | { ok: false; error: OtpFailure }>;
  getSession(): Promise<Session | null>;
  /** Persists profile edits made in the app. Same storage as the session token. */
  saveSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;
}

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

/** Maps a server user to the profile shape the app screens render. */
export function sessionFromUser(token: string, user: ServerUser): Session {
  return {
    token,
    profile: {
      id: user._id,
      name: user.name,
      phone: user.phone ?? '',
      joinedAt: user.createdAt,
      email: user.email || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      city: user.city || undefined,
      goal: user.goal || undefined,
      avatarUrl: user.avatarUrl || undefined,
    },
  };
}

function persistAndApply(session: Session): Session {
  setApiToken(session.token);
  return session;
}

/** Server status → what the OTP screen shows. Anything unexpected reads as "could not reach the server". */
function otpFailureFrom(err: unknown): OtpFailure {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'incorrect';
    if (err.status === 410) return 'expired';
    if (err.status === 403) return 'blocked';
  }
  return 'network';
}

export const authService: AuthService = {
  async requestOtp(phone) {
    try {
      await api.requestOtp(phone);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: otpFailureFrom(err) };
    }
  },

  async verifyOtp(phone, code) {
    try {
      const { token, user } = await api.verifyOtp(phone, code);
      const session = persistAndApply(sessionFromUser(token, user));
      await writeStored(SESSION_KEY, JSON.stringify(session));
      return { ok: true, session };
    } catch (err) {
      return { ok: false, error: otpFailureFrom(err) };
    }
  },

  async getSession() {
    const raw = await readStored(SESSION_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Session;
      if (!session?.token || !session?.profile) return null;
      setApiToken(session.token);
      return session;
    } catch {
      return null;
    }
  },

  async saveSession(session) {
    setApiToken(session.token);
    await writeStored(SESSION_KEY, JSON.stringify(session));
  },

  async clearSession() {
    setApiToken(null);
    await deleteStored(SESSION_KEY);
  },
};
