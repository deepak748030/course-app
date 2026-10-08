/**
 * Crash-proof key/value storage.
 *
 * `AsyncStorage` on web reads `window.localStorage`, which throws inside a cross-origin
 * iframe when the browser blocks third-party storage (Safari does this by default, and so
 * do Chrome profiles with tracking protection). A thrown storage error used to leave the
 * app stuck on its boot screen, so every call here is:
 *
 *  - wrapped in try/catch and never rejects,
 *  - given a timeout so a hanging provider cannot block first paint,
 *  - backed by an in-memory map, so the session still works end to end even when the
 *    device refuses to persist anything (the UI keeps working, data simply does not
 *    survive a reload).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();
const READ_TIMEOUT_MS = 1200;

export const storageWarning = {
  readable: true as boolean,
  writable: true as boolean,
};

function settle<T>(run: () => Promise<T>, fallback: T, label: 'read' | 'write'): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const finish = (value: T) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const timer = setTimeout(() => {
      if (label === 'read') storageWarning.readable = false;
      finish(fallback);
    }, READ_TIMEOUT_MS);

    try {
      // A blocked localStorage throws synchronously on web, before any promise exists.
      run()
        .then((value) => {
          clearTimeout(timer);
          finish(value);
        })
        .catch(() => {
          clearTimeout(timer);
          if (label === 'read') storageWarning.readable = false;
          finish(fallback);
        });
    } catch {
      clearTimeout(timer);
      if (label === 'read') storageWarning.readable = false;
      finish(fallback);
    }
  });
}

export const storage = {
  async get(key: string): Promise<string | null> {
    return settle(async () => (await AsyncStorage.getItem(key)) ?? memory.get(key) ?? null, memory.get(key) ?? null, 'read');
  },

  async set(key: string, value: string): Promise<void> {
    memory.set(key, value);
    const ok = await settle(async () => {
      await AsyncStorage.setItem(key, value);
      return true;
    }, false, 'write');
    if (!ok) storageWarning.writable = false;
  },

  async remove(key: string): Promise<void> {
    memory.delete(key);
    const ok = await settle(async () => {
      await AsyncStorage.removeItem(key);
      return true;
    }, false, 'write');
    if (!ok) storageWarning.writable = false;
  },
};
