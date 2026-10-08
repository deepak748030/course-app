/**
 * Remote catalog — fetches the live catalog from the YDU Academy server and maps it onto
 * the app's types. There is no bundled catalog anymore: what the server has is what the
 * app shows, and the catalog context refreshes in realtime when admins change it.
 */

import { API_URL, api, type ServerCourse } from '@/services/api';

import type { Category, Course, Lesson, Recipe, VideoKey } from '@/types';

/**
 * Lesson videos still ship with the app (bundled demo footage). Each category maps to one
 * clip; courses without a category clip fall back to the ferments reel.
 */
const CATEGORY_CLIP: Record<string, VideoKey> = {
  milk: 'milk',
  paneer: 'paneer',
  ghee: 'ghee',
  ferments: 'curd-ferments',
  cheese: 'curd-ferments',
  frozen: 'ghee',
  farming: 'milk',
  business: 'curd-ferments',
};

/** expo-image accepts { uri } sources; the web needs a plain string in some cases. */
function coverSource(coverUrl: string) {
  if (!coverUrl) return require('@/assets/images/placeholder-panel-4x3.jpg');
  // The local upload provider (no Cloudinary configured) answers /uploads/... paths.
  const url = coverUrl.startsWith('/') ? `${API_URL}${coverUrl}` : coverUrl;
  return { uri: url };
}

function mapRecipe(server: ServerCourse['sections'][number]['lessons'][number]['recipe']): Recipe | undefined {
  if (!server) return undefined;
  return {
    id: server.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: server.title,
    servings: server.servings,
    prepMinutes: server.prepMinutes,
    cookMinutes: server.cookMinutes,
    ingredients: server.ingredients,
    steps: server.steps,
    tips: server.tips,
  };
}

export function mapCourse(server: ServerCourse): Course {
  const categorySlug = typeof server.category === 'string' ? '' : server.category.slug;
  const video: VideoKey = CATEGORY_CLIP[categorySlug] ?? 'curd-ferments';

  const lessons: Lesson[] = [];
  const sections = server.sections.map((section) => {
    section.lessons.forEach((lesson) => {
      lessons.push({
        id: lesson._id,
        courseId: server.slug,
        sectionId: section._id,
        title: lesson.title,
        description: lesson.description,
        minutes: lesson.minutes,
        isPreview: lesson.isPreview,
        video,
        recipe: mapRecipe(lesson.recipe),
      });
    });
    return { id: section._id, title: section.title, summary: section.summary };
  });

  return {
    id: server.slug,
    remoteId: server._id,
    title: server.title,
    promise: server.promise,
    description: server.description,
    cover: coverSource(server.coverUrl),
    video,
    categoryId: categorySlug,
    level: server.level,
    language: server.language === 'Hindi' || server.language === 'English + Hindi' ? server.language : 'English',
    hours: server.hours ?? Math.round(((server.totalMinutes ?? 0) / 60) * 10) / 10,
    lessonCount: server.lessonCount ?? lessons.length,
    priceInr: server.priceInr,
    listPriceInr: server.listPriceInr ?? undefined,
    rating: server.rating,
    reviewCount: server.reviewCount,
    outcomes: server.outcomes,
    equipment: server.equipment,
    audience: server.audience,
    sections,
    lessons,
    reviews: [],
    isPopular: server.isPopular,
    isBeginnerPick: server.isBeginnerPick,
  };
}

export interface CatalogData {
  courses: Course[];
  categories: Category[];
}

/** One round-trip for both collections; parallel and lean on the server side. */
export async function fetchCatalog(): Promise<CatalogData> {
  const [coursesRes, categoriesRes] = await Promise.all([api.courses(), api.categories()]);
  return {
    courses: coursesRes.courses.map(mapCourse),
    categories: categoriesRes.categories.map((category) => ({
      id: category.slug,
      label: category.label,
      icon: category.icon,
    })),
  };
}

/** True when a native device points at localhost — it needs the machine's LAN IP instead. */
export const usingLocalhostOnDevice =
  typeof document === 'undefined' && /localhost|127\.0\.0\.1/.test(api_base());

function api_base() {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';
}
