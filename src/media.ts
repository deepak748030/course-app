/**
 * Media asset registry — the single place that maps data keys to bundled assets.
 * Every require() here is static so Metro bundles the file; data files reference keys, never paths.
 *
 * Provenance: photography in assets/images is AI-generated for this prototype.
 * Videos in assets/videos are derived demo clips (slow push-in over the course still) — see
 * scripts/generate-media.sh. Swap the videos for real course footage when it exists.
 */

import type { ImageSource } from 'expo-image';

import type { VideoKey } from './types';

export const images = {
  onboardingFreshMilk: require('@/assets/images/onboarding-fresh-milk.jpg') as ImageSource,
  onboardingTesting: require('@/assets/images/onboarding-testing.jpg') as ImageSource,
  onboardingRange: require('@/assets/images/course-artisan-cheese.jpg') as ImageSource,
  /** Home hero: the reception bench, which is where every dairy story starts. */
  heroHome: require('@/assets/images/course-milk-foundations.jpg') as ImageSource,

  coverMilkFoundations: require('@/assets/images/course-milk-foundations.jpg') as ImageSource,
  coverPaneerCraft: require('@/assets/images/course-paneer-craft.jpg') as ImageSource,
  coverCurdFerments: require('@/assets/images/course-curd-ferments.jpg') as ImageSource,
  coverGheeButter: require('@/assets/images/course-ghee-butter.jpg') as ImageSource,
  coverFrozenDesserts: require('@/assets/images/course-frozen-desserts.jpg') as ImageSource,
  coverArtisanCheese: require('@/assets/images/course-artisan-cheese.jpg') as ImageSource,
  coverDairyFarming: require('@/assets/images/course-dairy-farming.jpg') as ImageSource,
  coverDairyBusiness: require('@/assets/images/course-dairy-business.jpg') as ImageSource,
} as const;

/** Demo clips. Replace with real lesson media; keys stay the same. */
/**
 * Every bundled demo lesson clip is 960×540 (verified from the files themselves), which is what the
 * player's quality readout names on platforms that do not report video tracks — web, for instance.
 */
export const CLIP_RENDITION = { width: 960, height: 540 } as const;

export const videos: Record<VideoKey, number> = {
  milk: require('@/assets/videos/demo-clip-milk.mp4'),
  paneer: require('@/assets/videos/demo-clip-paneer.mp4'),
  ghee: require('@/assets/videos/demo-clip-ghee.mp4'),
  'curd-ferments': require('@/assets/videos/demo-clip-curd-ferments.mp4'),
};
