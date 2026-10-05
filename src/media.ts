/**
 * Media asset registry — the single place that maps data keys to bundled assets.
 * Every require() here is static so Metro bundles the file; data files reference keys, never paths.
 *
 * Provenance: photography in assets/images is AI-generated for this prototype.
 * Videos in assets/videos are derived demo clips (slow push-in over a still) — see
 * scripts/generate-media.sh. Swap the videos for real course footage when it exists.
 */

import type { ImageSource } from 'expo-image';

import type { VideoKey } from './types';

export const images = {
  onboardingJoy: require('@/assets/images/onboarding-joy-of-cooking.jpg') as ImageSource,
  onboardingGuided: require('@/assets/images/onboarding-guided-learning.jpg') as ImageSource,
  onboardingConfidence: require('@/assets/images/onboarding-confidence-variety.jpg') as ImageSource,
  heroHome: require('@/assets/images/hero-home.jpg') as ImageSource,

  biryani: require('@/assets/images/course-biryani.jpg') as ImageSource,
  everydayIndian: require('@/assets/images/course-everyday-indian.jpg') as ImageSource,
  bakingBasics: require('@/assets/images/course-baking-basics.jpg') as ImageSource,
  southIndian: require('@/assets/images/course-south-indian-breakfasts.jpg') as ImageSource,
  gravies: require('@/assets/images/course-restaurant-gravies.jpg') as ImageSource,
  healthyWeeknight: require('@/assets/images/course-healthy-weeknight.jpg') as ImageSource,
  egglessDesserts: require('@/assets/images/course-eggless-desserts.jpg') as ImageSource,
  knifeSkills: require('@/assets/images/course-knife-skills.jpg') as ImageSource,

  meera: require('@/assets/images/instructor-meera.jpg') as ImageSource,
  arjun: require('@/assets/images/instructor-arjun.jpg') as ImageSource,
  rhea: require('@/assets/images/instructor-rhea.jpg') as ImageSource,
  vikram: require('@/assets/images/instructor-vikram.jpg') as ImageSource,
  nandini: require('@/assets/images/instructor-nandini.jpg') as ImageSource,
} as const;

/** Demo clips. Replace with real lesson media; keys stay the same. */
export const videos: Record<VideoKey, number> = {
  'home-cooking': require('@/assets/videos/demo-clip-home-cooking.mp4'),
  gravies: require('@/assets/videos/demo-clip-gravies.mp4'),
  baking: require('@/assets/videos/demo-clip-baking.mp4'),
  foundations: require('@/assets/videos/demo-clip-foundations.mp4'),
};
