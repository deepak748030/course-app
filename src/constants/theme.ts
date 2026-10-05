/**
 * Design tokens for Rasoi Studio.
 *
 * Rules this file enforces (Design Rules — App):
 * - ONE font family (DM Sans). No serif, no third family.
 * - 5 type sizes on a 1.25 scale. Two weights only: 400 regular, 600 semibold.
 * - 3 text colours: primary, muted, subtle. Colour ranks inside a line, size ranks between blocks.
 * - Line-height shrinks as size grows (1.7 small -> 1.17 display); letter-spacing tightens >= 24.
 * - 4px spacing base; 8px side padding baseline; 16px content sections; 8px gap between items.
 * - Concentric radii on a small/medium/large scale, pills only for single-line content.
 * - NO shadows anywhere: elevation comes from surface colour + hairlines.
 */

import '@/global.css';

import type { TextStyle } from 'react-native';

/** Raw palette. Prefer the semantic groups below in components. */
export const palette = {
  paper: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EDE4',
  ink: '#1C1A17',
  inkMuted: '#6B6459',
  inkSubtle: '#948C80',
  border: 'rgba(28, 26, 23, 0.10)',
  divider: 'rgba(28, 26, 23, 0.08)',
  primary: '#9F3F2F',
  primaryPressed: '#843225',
  primarySoft: '#F6E7E1',
  sage: '#65755A',
  sageSoft: '#EAEEE5',
  gold: '#C49A4A',
  goldSoft: '#F6ECD9',
  success: '#2F6B47',
  successSoft: '#E7F0EA',
  error: '#B42318',
  errorSoft: '#FAEAE8',
  player: '#121412',
  playerRaised: '#1B1E1B',
} as const;

/** Semantic colours. Gold is decoration only — never text on paper. */
export const colors = {
  background: palette.paper,
  surface: palette.surface,
  surfaceAlt: palette.surfaceAlt,
  border: palette.border,
  divider: palette.divider,

  text: palette.ink,
  textMuted: palette.inkMuted,
  textSubtle: palette.inkSubtle,
  textInverse: palette.surface,

  primary: palette.primary,
  primaryPressed: palette.primaryPressed,
  primarySoft: palette.primarySoft,

  sage: palette.sage,
  sageSoft: palette.sageSoft,
  gold: palette.gold,
  goldSoft: palette.goldSoft,
  success: palette.success,
  successSoft: palette.successSoft,
  error: palette.error,
  errorSoft: palette.errorSoft,

  player: palette.player,
  playerRaised: palette.playerRaised,
  onPlayer: 'rgba(255, 255, 255, 0.92)',
  onPlayerMuted: 'rgba(255, 255, 255, 0.60)',
  scrim: 'rgba(18, 20, 18, 0.55)',
} as const;

export type ColorToken = keyof typeof colors;

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
  /** Uppercase micro label: only place that opens letter-spacing. */
  overline: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export type TypeToken = keyof typeof type;

/** Prices, timers and counters must not wobble as they update. */
export const tabularNums = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };

/** Restrained motion; every duration respects reduced motion. */
export const motion = {
  feedback: 90,
  press: 110,
  entrance: 220,
  exit: 160,
  sheet: 320,
  shimmer: 900,
} as const;
