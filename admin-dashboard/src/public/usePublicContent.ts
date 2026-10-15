import { useEffect, useSyncExternalStore } from 'react';
import { publicApi } from '../api/client';
import type { AppSettings, ContentDefaults } from '../api/types';
import { BUILT_IN_CONTENT } from '../data/builtInContent';
import { contentDefaultsOrBuiltIn } from '../lib/legal';

/**
 * The settings and documents behind every public page, loaded once per visit and shared by all of
 * them (moving from Privacy to Terms does not refetch).
 *
 *   loading  first request in flight — pages show a skeleton
 *   ready    the server answered — the admin's own text and business details are used
 *   offline  the server did not answer in time (a free-tier host waking up, or down) — pages show
 *            the built-in documents at once, and a slower second attempt swaps in the live
 *            content if it arrives
 */
export type PublicContent = {
  status: 'loading' | 'ready' | 'offline';
  settings: AppSettings | null;
  defaults: ContentDefaults;
};

let state: PublicContent = { status: 'loading', settings: null, defaults: BUILT_IN_CONTENT };
let started = false;
const listeners = new Set<() => void>();

function set(next: PublicContent) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function fetchContent(attempt: number) {
  try {
    const { settings, contentDefaults } = await publicApi.content();
    set({ status: 'ready', settings, defaults: contentDefaultsOrBuiltIn(contentDefaults) });
  } catch {
    if (state.status !== 'ready') set({ ...state, status: 'offline' });
    // One patient retry: a sleeping server usually answers within a minute.
    if (attempt === 0) window.setTimeout(() => void fetchContent(1), 4000);
  }
}

function start() {
  if (started) return;
  started = true;
  void fetchContent(0);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePublicContent(): PublicContent {
  useEffect(start, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Sets the tab title and the description search engines and link previews show. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.content ?? '';
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    return () => {
      document.title = previous;
      if (meta && description) meta.content = previousDescription;
    };
  }, [title, description]);
}
