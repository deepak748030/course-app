/**
 * Design tokens for Rasoi Studio.
 *
 * Light-first by design: the product identity is a warm paper surface with one
 * immersive dark player surface. There is no dark theme yet.
 * ponytail: single theme, no theme provider. Add a dark palette + `useTheme` when dark mode is actually requested.
 */

import '@/global.css';

/** Raw brand ramp. Prefer the semantic tokens below in components. */
export const palette = {
  paper: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceWarm: '#F2EBE2',
  primary: '#9F3F2F',
  primaryPressed: '#843225',
  primarySoft: '#F4E4DE',
  ink: '#25231F',
  inkSecondary: '#686259',
  border: '#E8E0D6',
  sage: '#65755A',
  sageSoft: '#E9EDE4',
  gold: '#C49A4A',
  goldSoft: '#F3E9D5',
  success: '#2F6B47',
  successSoft: '#E4EFE7',
  error: '#B42318',
  errorSoft: '#FAE9E7',
  player: '#121412',
  playerElevated: '#1B1E1B',
  onPlayer: '#F4F1EC',
  onPlayerMuted: '#B9B4AC',
} as const;

/** Semantic colors. Gold is for decoration only — never small text on paper. */
export const colors = {
  background: palette.paper,
  surface: palette.surface,
  surfaceWarm: palette.surfaceWarm,
  border: palette.border,
  text: palette.ink,
  textSecondary: palette.inkSecondary,
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
  playerElevated: palette.playerElevated,
  onPlayer: palette.onPlayer,
  onPlayerMuted: palette.onPlayerMuted,
} as const;

export type ColorToken = keyof typeof colors;

/** 8-point scale with a few 4-point steps. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Horizontal screen padding. */
export const screenPadding = 20;

/** Keeps line lengths readable on tablets and the web build. */
export const maxContentWidth = 640;

/** Minimum comfortable touch target (iOS 44pt / Android 48dp). */
export const touchTarget = 48;

export const radius = {
  input: 15,
  button: 16,
  card: 22,
  sheet: 28,
  image: 18,
  pill: 999,
} as const;

/** Bundled font families (see @/app/_layout.tsx for loading). */
export const font = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  serif: 'Lora_500Medium',
  serifSemibold: 'Lora_600SemiBold',
} as const;

/** Type scale. Line heights are tuned, sizes are the spec's editorial scale. */
export const type = {
  onboarding: { fontFamily: font.serifSemibold, fontSize: 35, lineHeight: 43 },
  screenTitle: { fontFamily: font.serifSemibold, fontSize: 29, lineHeight: 37 },
  section: { fontFamily: font.serifSemibold, fontSize: 22, lineHeight: 29 },
  cardTitle: { fontFamily: font.semibold, fontSize: 18, lineHeight: 25 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: font.semibold, fontSize: 16.5, lineHeight: 22 },
  supporting: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17 },
} as const;

/** Restrained motion tokens; every duration honours reduced-motion. */
export const motion = {
  screen: 220,
  press: 110,
  sheet: 320,
  quick: 160,
  enter: 260,
} as const;

export const shadow = {
  card: {
    shadowColor: '#3B2E22',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#3B2E22',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
} as const;
