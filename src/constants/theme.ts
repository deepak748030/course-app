/**
 * Design tokens for Rasoi Studio.
 *
 * Rules this file enforces (Design Rules — App):
 * - ONE font family (DM Sans). No serif, no third family.
 * - 5 type sizes on a 1.25 scale. Two weights only: 400 regular, 600 semibold.
 * - 3 text colours: primary, muted, subtle. Yellow is a fill; dark amber carries text and icons.
 * - Line-height shrinks as size grows (1.7 small -> 1.17 display); letter-spacing tightens >= 24.
 * - 4px spacing base; 8px side padding baseline; 16px content sections; 8px gap between items.
 * - Concentric radii on a small/medium/large scale, pills only for single-line content.
 * - White surfaces, one yellow accent, no shadows: elevation comes from tone + hairlines.
 * - Headers: 16px side padding, one overline + one semibold line, actions on the right.
 * - Search: pill field on the warm surface tone with a hairline border, never icon-only.
 */

import '@/global.css';

import type { TextStyle } from 'react-native';

/**
 * Raw palette: white surfaces, one yellow accent, warm neutrals.
 * Yellow is a *fill* colour — on white it needs the darker amber next to it to stay legible.
 */
export const palette = {
  white: '#FFFFFF',
  surfaceAlt: '#FBF5E4',
  ink: '#17150F',
  inkMuted: '#6B6455',
  inkSubtle: '#968F7C',
  border: 'rgba(23, 21, 15, 0.12)',
  divider: 'rgba(23, 21, 15, 0.08)',
  yellow: '#FFC629',
  yellowPressed: '#F0B100',
  yellowSoft: '#FFF4CC',
  amberDeep: '#8A6200',
  inkOnYellow: '#1F1B0E',
  olive: '#6F6A2A',
  oliveSoft: '#F5F1DC',
  gold: '#D9A400',
  goldSoft: '#FBEEC4',
  success: '#2F6B47',
  successSoft: '#E7F0EA',
  error: '#B42318',
  errorSoft: '#FAEAE8',
  player: '#14130E',
  playerRaised: '#1E1C15',
} as const;

/** Semantic colours. Yellow (`primary`) is a fill; `accentText` is its readable counterpart. */
export const colors = {
  background: palette.white,
  surface: palette.white,
  surfaceAlt: palette.surfaceAlt,
  border: palette.border,
  divider: palette.divider,

  text: palette.ink,
  textMuted: palette.inkMuted,
  textSubtle: palette.inkSubtle,
  textInverse: palette.white,

  /** Yellow: buttons, chips, progress, selection. */
  primary: palette.yellow,
  primaryPressed: palette.yellowPressed,
  primarySoft: palette.yellowSoft,
  /** Dark amber for labels, links and icons that sit on white or on the soft yellow. */
  accentText: palette.amberDeep,
  /** Text and icons placed on top of the yellow fill. */
  onAccent: palette.inkOnYellow,

  sage: palette.olive,
  sageSoft: palette.oliveSoft,
  gold: palette.gold,
  goldSoft: palette.goldSoft,
  success: palette.success,
  successSoft: palette.successSoft,
  error: palette.error,
  errorSoft: palette.errorSoft,

  player: palette.player,
  playerRaised: palette.playerRaised,
  onPlayer: 'rgba(255, 255, 255, 0.92)',
  onPlayerMuted: 'rgba(255, 255, 255, 0.62)',
  scrim: 'rgba(20, 19, 14, 0.58)',
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
  /** Tab bar labels: one step below `label` (tab bar rule: 10px, one word, semibold when active). */
  navLabel: { fontFamily: font.regular, fontSize: 10, lineHeight: 14, letterSpacing: 0.1 },
  navLabelActive: { fontFamily: font.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.1 },
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
