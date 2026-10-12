import { useSyncExternalStore } from 'react';

/**
 * Admin colour themes. The default is the app's green & white; yellow & white is the
 * app's yellow palette. The CSS variables live in index.css ([data-theme='yellow']);
 * this module picks the theme, persists it, updates the favicon and supplies chart colours.
 */
export type AdminThemeId = 'green' | 'yellow';

export const ADMIN_THEMES: Record<
  AdminThemeId,
  { label: string; description: string; swatch: string; favicon: string; chart: { brand: string; gold: string; ink: string } }
> = {
  green: {
    label: 'Green & white',
    description: 'The default. Matches the learner app.',
    swatch: '#14532D',
    favicon: '/favicon-green.png',
    chart: { brand: '#14532D', gold: '#2F6B47', ink: '#0F231A' },
  },
  yellow: {
    label: 'Yellow & white',
    description: 'Bright yellow accents on white, from the app’s yellow palette.',
    swatch: '#FFC629',
    favicon: '/favicon-yellow.png',
    chart: { brand: '#FFC629', gold: '#D9A400', ink: '#17150F' },
  },
};

const STORAGE_KEY = 'ydu.admin.theme';
const listeners = new Set<() => void>();

export function getAdminTheme(): AdminThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'green' || saved === 'yellow') return saved;
  } catch {
    /* storage blocked: fall back to the default */
  }
  return 'green';
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
}

/** Applies a theme to the page (CSS variables, favicon) without saving it. */
export function applyAdminTheme(id: AdminThemeId) {
  document.documentElement.dataset.theme = id;
  setFavicon(ADMIN_THEMES[id].favicon);
}

/** Applies and remembers the theme, then tells every subscribed component. */
export function setAdminTheme(id: AdminThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore: the theme still applies for this visit */
  }
  applyAdminTheme(id);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAdminTheme(): [AdminThemeId, (id: AdminThemeId) => void] {
  const theme = useSyncExternalStore(subscribe, getAdminTheme, () => 'green' as AdminThemeId);
  return [theme, setAdminTheme];
}
