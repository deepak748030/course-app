import type { ImageSource } from 'expo-image';

/**
 * Media asset registry — the single place that maps data keys to bundled assets.
 * Every require() here is static so Metro bundles the file; data files reference keys, never paths.
 * Only artwork the app actually shows is bundled. Lesson videos come from the server.
 */

export const images = {
  /**
   * The supplied brand artwork. `brandLogo` is the file itself — the whole lockup, disc (or field)
   * and all — and it is what the app shows wherever there is room for it: the boot screen, the
   * sign-in hero and the home header. `brandMark` is the same file with the wordmark cut away, for
   * the small spots where a 14px "ACADEMY" would be a smudge (the footer, the brand row). Both come
   * out of `scripts/generate-brand-icons.mjs`, so neither can drift from the launcher icon.
   */
  brandLogo: require('@/assets/images/logo.png') as ImageSource,
  brandMark: require('@/assets/images/brand-mark.png') as ImageSource,

  /**
   * Onboarding slide 1: the YDU Academy poster. It carries its own lettering — the lock-up, the name
   * and the tagline are printed in the artwork — so the slide writes nothing over it at all.
   *
   * Onboarding art is portrait (768×1376) on purpose: each slide's image fills the whole screen with
   * `cover`, so a landscape frame would be cropped to a narrow vertical slice. Keep new art portrait.
   */
  onboardingPoster: require('@/assets/images/onboarding-ydu-poster.jpg') as ImageSource,
  onboardingFreshMilk: require('@/assets/images/onboarding-fresh-milk.jpg') as ImageSource,
  onboardingTesting: require('@/assets/images/onboarding-testing.jpg') as ImageSource,
} as const;
