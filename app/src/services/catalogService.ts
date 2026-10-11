/**
 * Remote catalog — fetches the live catalog from the YDU Academy server and maps it onto
 * the app's types. There is no bundled catalog anymore: what the server has is what the
 * app shows, and the catalog context refreshes in realtime when admins change it.
 */

import { COVER_PLACEHOLDER } from '@/constants/covers';
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
export function coverSource(coverUrl: string) {
  if (!coverUrl) return COVER_PLACEHOLDER;
  // The local upload provider (no Cloudinary configured) answers /uploads/... paths.
  const url = coverUrl.startsWith('/') ? `${API_URL}${coverUrl}` : coverUrl;
  return { uri: url };
}

/** Any media URL (banner image, cover) as an expo-image source, with the shared fallback. */
export const mediaSource = coverSource;

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
        hasCourseVideo: Boolean(lesson.videoKey),
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

// ---------------------------------------------------------------------------
// Offline cache + conditional refetch.
//
// Every successful catalog load is mirrored to device storage, so a cold start
// with no network opens straight into the last-known catalog instead of an
// error screen. Refetches send If-None-Match: when the server answers 304 the
// whole payload stays off the wire (Express's weak ETag covers this for free).
// ---------------------------------------------------------------------------

import { storage } from '@/lib/storage';

const CACHE_KEY = 'ydu.catalog.v1';
/** A cache older than this is still shown, but never trusted for a 304-only refresh. */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CatalogCache {
  etag: string;
  savedAt: number;
  data: CatalogData;
}

export async function readCatalogCache(): Promise<CatalogCache | null> {
  try {
    const raw = await storage.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCache;
    if (!parsed?.etag || !Array.isArray(parsed?.data?.courses)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogCache(cache: CatalogCache) {
  // Fire-and-forget; storage failures are already swallowed by lib/storage.
  void storage.set(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
}

export type CatalogRefreshResult =
  | { notModified: true; categories: Category[] }
  | { notModified: false; data: CatalogData; etag: string };

async function fetchWithEtag(path: string, etag: string | null): Promise<{ status: number; body?: unknown; etag: string | null }> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: etag ? { 'If-None-Match': etag } : {},
  });
  if (response.status === 304) return { status: 304, etag };
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return { status: response.status, body: await response.json(), etag: response.headers.get('etag') };
}

const mapCategories = (rows: { slug: string; label: string; icon: string }[]): Category[] =>
  rows.map((category) => ({ id: category.slug, label: category.label, icon: category.icon }));

/**
 * Refetch with the given ETag. Courses carry the payload weight, so only they
 * are conditional: a 304 keeps the whole course list off the wire. Categories
 * are eight tiny rows and always come back fresh.
 */
export async function refreshCatalog(etag: string | null): Promise<CatalogRefreshResult> {
  const [coursesRes, categoriesRes] = await Promise.all([
    fetchWithEtag('/api/courses', etag),
    fetchWithEtag('/api/categories', null),
  ]);

  const categories = mapCategories(
    (categoriesRes.body as { categories: { slug: string; label: string; icon: string }[] }).categories,
  );

  if (coursesRes.status === 304) {
    return { notModified: true, categories };
  }

  return {
    notModified: false,
    data: {
      courses: (coursesRes.body as { courses: ServerCourse[] }).courses.map(mapCourse),
      categories,
    },
    etag: coursesRes.etag ?? '',
  };
}

export const cacheIsFresh = (cache: CatalogCache) => Date.now() - cache.savedAt < CACHE_MAX_AGE_MS;

/** True when a native device points at localhost — it needs the machine's LAN IP instead. */
export const usingLocalhostOnDevice =
  typeof document === 'undefined' && /localhost|127\.0\.0\.1/.test(api_base());

function api_base() {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';
}
