/**
 * Design tokens for Rasoi Studio — two themes, one component tree.
 *
 * Rules this file enforces (Design Rules — App):
 * - ONE font family (DM Sans). No serif, no third family.
 * - 5 type sizes on a 1.25 scale. Two weights only: 400 regular, 600 semibold.
 * - 3 text colours: primary, muted, subtle. The accent is a fill; `accentText` carries accent text
 *   and icons at readable contrast.
 * - Line-height shrinks as size grows (1.7 small -> 1.17 display); letter-spacing tightens >= 24.
 * - 4px spacing base; 8px side padding baseline; 16px content sections; 8px gap between items.
 * - Concentric radii on a small/medium/large scale, pills only for single-line content.
 * - White surfaces, no shadows: elevation comes from tone + hairlines.
 *
 * THEMES
 * Two palettes ship in the app and the user picks between them on Profile:
 *   `yellow` — white surfaces, warm yellow accent (the original look),
 *   `green`  — white surfaces, deep green accent.
 * Both are white-first: only the accent, the warm neutrals and the tinted surface change, so the
 * layout, type scale and 8px rhythm are identical in both.
 *
 * How the switch reaches every component without touching component code:
 *   - `colors` is a live proxy: any read (inline props like `{ color: colors.text }`, default
 *     parameter values) returns the value from the palette that is active *at that moment*.
 *   - Style objects are created through `createStyles(() => StyleSheet.create({...}))` instead of
 *     `StyleSheet.create(...)` directly. StyleSheet.create runs once per module; createStyles wraps
 *     it, resolves it lazily per theme and memoises, so a re-render picks up the new palette.
 *   - The root remounts the tree when the theme changes (see `_layout.tsx`), which is what makes
 *     every screen re-render and read the new values. Nothing else about a screen changes.
 *
 * The offer badge stays brand yellow in both themes on purpose: the Lottie mark inside it is drawn
 * in ink and needs the yellow ground to stay legible (see components/offer-tag.tsx).
 */

import '@/global.css';

import type { TextStyle } from 'react-native';

export type ThemeId = 'yellow' | 'green';

export type Palette = {
  /** Page and card surfaces. White in both themes. */
  background: string;
  surface: string;
  /** Warm/tinted block: fact boxes, icon tiles, empty states. */
  surfaceAlt: string;
  border: string;
  divider: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;

  /** Accent FILL: buttons, chips, progress, selection. */
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  /** Readable accent for text and icons on white or on `primarySoft`. */
  accentText: string;
  /** Text and icons placed on top of the accent fill. */
  onAccent: string;

  sage: string;
  sageSoft: string;
  gold: string;
  goldSoft: string;
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;

  player: string;
  playerRaised: string;
  onPlayer: string;
  onPlayerMuted: string;
  scrim: string;
};

/** White + yellow. The original palette; values are unchanged by the theme work. */
export const yellowPalette: Palette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF5E4',
  border: 'rgba(23, 21, 15, 0.12)',
  divider: 'rgba(23, 21, 15, 0.08)',

  text: '#17150F',
  textMuted: '#6B6455',
  textSubtle: '#968F7C',
  textInverse: '#FFFFFF',

  primary: '#FFC629',
  primaryPressed: '#F0B100',
  primarySoft: '#FFF4CC',
  accentText: '#8A6200',
  onAccent: '#1F1B0E',

  sage: '#6F6A2A',
  sageSoft: '#F5F1DC',
  gold: '#D9A400',
  goldSoft: '#FBEEC4',
  success: '#2F6B47',
  successSoft: '#E7F0EA',
  error: '#B42318',
  errorSoft: '#FAEAE8',

  player: '#14130E',
  playerRaised: '#1E1C15',
  onPlayer: 'rgba(255, 255, 255, 0.92)',
  onPlayerMuted: 'rgba(255, 255, 255, 0.62)',
  scrim: 'rgba(20, 19, 14, 0.58)',
};

/**
 * White + deep green. Same surfaces and text scale, green accent: `primary` is dark enough that
 * white sits on it at 9:1, and `accentText` is the same green for labels and icons on white.
 */
export const greenPalette: Palette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF4EE',
  border: 'rgba(16, 35, 26, 0.14)',
  divider: 'rgba(16, 35, 26, 0.09)',

  text: '#0F231A',
  textMuted: '#4F6558',
  textSubtle: '#7A8C80',
  textInverse: '#FFFFFF',

  primary: '#14532D',
  primaryPressed: '#0E3F22',
  primarySoft: '#E4F0E7',
  accentText: '#14532D',
  onAccent: '#FFFFFF',

  sage: '#2F6B47',
  sageSoft: '#E7F0EA',
  gold: '#D9A400',
  goldSoft: '#FBEEC4',
  success: '#2F6B47',
  successSoft: '#E7F0EA',
  error: '#B42318',
  errorSoft: '#FAEAE8',

  player: '#0E1A13',
  playerRaised: '#16241C',
  onPlayer: 'rgba(255, 255, 255, 0.92)',
  onPlayerMuted: 'rgba(255, 255, 255, 0.62)',
  scrim: 'rgba(10, 20, 14, 0.6)',
};

export const THEME_PALETTES: Record<ThemeId, Palette> = {
  yellow: yellowPalette,
  green: greenPalette,
};

/** Everything the theme picker needs to show a preview, without importing a palette twice. */
export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'yellow', label: 'Yellow', description: 'Warm yellow accent' },
  { id: 'green', label: 'Green', description: 'Deep green accent' },
];

export const DEFAULT_THEME: ThemeId = 'yellow';

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'yellow' || value === 'green';
}

/* ------------------------------------------------------------------ *
 * Active theme
 * ------------------------------------------------------------------ */

let activeThemeId: ThemeId = DEFAULT_THEME;

export function getActiveTheme(): ThemeId {
  return activeThemeId;
}

/**
 * Called by the root layout before it renders a theme. Every palette read after this returns the
 * new values, and every `createStyles` factory re-runs for the new theme on first access.
 */
export function setActiveTheme(id: ThemeId) {
  activeThemeId = id;
}

/**
 * The live palette. Reads always hit the active theme, which is what lets inline props and default
 * parameter values stay theme-aware without a hook at every call site.
 */
export const colors: Palette = new Proxy({} as Palette, {
  get: (_target, key) =>
    typeof key === 'string' ? (THEME_PALETTES[activeThemeId] as unknown as Record<string, string>)[key] : undefined,
  has: () => true,
  ownKeys: () => Reflect.ownKeys(THEME_PALETTES[activeThemeId]),
  getOwnPropertyDescriptor: (_target, key) => ({
    value: (THEME_PALETTES[activeThemeId] as unknown as Record<string, string>)[key as string],
    enumerable: true,
    configurable: true,
    writable: false,
  }),
});

/** Kept for callers that want the palette by id (the picker's swatches). */
export function paletteFor(id: ThemeId): Palette {
  return THEME_PALETTES[id];
}

/**
 * Per-theme style sheet.
 *
 * Use it exactly like StyleSheet.create, wrapped:
 *
 *   const styles = createStyles(() => StyleSheet.create({ card: { backgroundColor: colors.surface } }));
 *
 * The factory runs once per theme and the result is memoised, so style objects keep a stable
 * identity between renders (which React Native's style diffing relies on) and simply resolve again
 * after a theme change. `StyleSheet.create` still does the work, so the returned types are exactly
 * the ones TypeScript already infers today.
 */
export function createStyles<T>(factory: () => T): T {
  const cache = new Map<ThemeId, Record<string, unknown>>();

  const resolve = () => {
    let resolved = cache.get(activeThemeId);
    if (!resolved) {
      resolved = factory() as Record<string, unknown>;
      cache.set(activeThemeId, resolved);
    }
    return resolved;
  };

  return new Proxy({} as Record<string, unknown>, {
    get: (_target, key) => (typeof key === 'string' ? resolve()[key] : undefined),
    has: (_target, key) => typeof key === 'string' && key in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, key) => ({
      value: resolve()[key as string],
      enumerable: true,
      configurable: true,
      writable: false,
    }),
  }) as T;
}

/* ------------------------------------------------------------------ *
 * Spacing, layout, radii, type
 * ------------------------------------------------------------------ */

/** 4px base scale. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Side padding. Banner / hero content ignores this and stays full-bleed. */
export const layout = {
  /** Baseline screen padding for rows, lists and rails. */
  screen: 8,
  /** Cards, forms and major sections. */
  section: 16,
  /** Gap between list items. */
  gap: 8,
  /** Gap between major sections. */
  sectionGap: 24,
  /** Header -> content, content -> footer. */
  edge: 16,
  headerHeight: 56,
  buttonHeight: 48,
  fieldHeight: 48,
  tabBarHeight: 56,
  /** Keeps line lengths readable on tablets and web. */
  maxWidth: 640,
  touchTarget: 44,
} as const;

/** Small / medium / large. Pills only for single-line content (chips, avatars, badges). */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** One family, two weights. */
export const font = {
  regular: 'DMSans_400Regular',
  semibold: 'DMSans_600SemiBold',
} as const;

/**
 * Five sizes. `null` letterSpacing means "leave it alone" (only display/title tighten,
 * and only uppercase micro labels open up).
 */
export const type = {
  display: { fontFamily: font.semibold, fontSize: 29, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: font.semibold, fontSize: 23, lineHeight: 28, letterSpacing: -0.45 },
  subheading: { fontFamily: font.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  label: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  labelStrong: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  /** Tab bar labels: one step below `label` (tab bar rule: 10px, one word, semibold when active). */
  navLabel: { fontFamily: font.regular, fontSize: 10, lineHeight: 14, letterSpacing: 0.1 },
  navLabelActive: { fontFamily: font.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.1 },
  /** Uppercase micro label: only place that opens letter-spacing. */
  overline: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export type TypeToken = keyof typeof type;

/** Prices, timers and counters must not wobble as they update. */
export const tabularNums = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };

