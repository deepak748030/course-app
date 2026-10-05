/**
 * Language: two switches, one app.
 *
 * The whole interface reads its copy through `t()` / `useT()`, so switching languages is not a
 * cosmetic flag — every screen, sheet, empty state, button, hint and accessibility label changes with
 * it, immediately, and the choice is remembered on the device.
 *
 * How it is put together:
 *   - the key is the English source string, so an unmapped key degrades to readable English instead of
 *     a placeholder token, and adding a language later is one file;
 *   - `{name}` placeholders are filled from the second argument, which keeps word order free for the
 *     translation (`{n} lessons` → `{n} लेसन`);
 *   - `useT()` subscribes to the language, so a component re-renders the moment it changes;
 *   - `t()` (no hook) exists for the pure helpers — validators, formatters — that cannot call hooks.
 *
 * What is intentionally *not* translated: the sample catalog. Course titles, lesson copy, batch
 * sheets, reviews and the legal documents are mock content, and the language picker says so on screen.
 */

import { useCallback, useSyncExternalStore } from 'react';

import { hi } from '@/i18n/hi';

export type Language = 'en' | 'hi';
export type TranslationParams = Record<string, string | number>;

/** The order the picker shows them in, and the copy that explains each one. */
export const LANGUAGES: { id: Language; label: string; description: string; sample: string }[] = [
  {
    id: 'en',
    label: 'English',
    description: 'The interface, the catalog and the batch sheets are all in English.',
    sample: 'Saved · Continue learning · My learning',
  },
  {
    id: 'hi',
    label: 'हिंदी',
    description: 'पूरा इंटरफ़ेस हिंदी में बदल जाता है। कोर्स और लेसन की सामग्री नमूना है और अंग्रेज़ी में रहती है।',
    sample: 'सेव किया · सीखना जारी रखें · मेरी पढ़ाई',
  },
];

const DICTIONARIES: Record<Language, Record<string, string>> = { en: {}, hi };

export const DEFAULT_LANGUAGE: Language = 'en';

export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'hi';

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

export const getLanguage = (): Language => current;

/** Applies a language to the whole tree and notifies every subscribed component. */
export function setActiveLanguage(next: Language) {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reactive language, for the few places that need the id itself rather than a string. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/** Fills `{name}` placeholders. Missing keys fall back to the English source string. */
export function translate(language: Language, key: string, params?: TranslationParams): string {
  const template = (language === 'en' ? undefined : DICTIONARIES[language][key]) ?? key;
  if (!params) return template;
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function t(key: string, params?: TranslationParams): string {
  return translate(current, key, params);
}

export function useT(): (key: string, params?: TranslationParams) => string {
  const language = useLanguage();
  return useCallback((key: string, params?: TranslationParams) => translate(language, key, params), [language]);
}

/** Every English key the Hindi dictionary answers, exported for the selfcheck. */
export const translatedKeys = Object.keys(hi);
