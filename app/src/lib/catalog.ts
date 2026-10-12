/**
 * Pure catalog helpers — everything the screens need to slice a catalog, with no data
 * dependency: the catalog itself comes from the server (see services/catalog-context).
 */

import type { Course, Id, Lesson } from '@/types';
import { formatClock, lessonLength } from '@/lib/format';

/**
 * Percent off when the catalog models a real discount, else null. Derived so a price change
 * can never disagree with the badge that advertises it.
 */
export function discountPercent(course: Course): number | null {
  if (!course.listPriceInr || course.listPriceInr <= course.priceInr) return null;
  return Math.round(((course.listPriceInr - course.priceInr) / course.listPriceInr) * 100);
}

export function courseIn(courses: Course[], id: string | undefined): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function nextLesson(course: Course, lessonId: string): Lesson | undefined {
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  return index === -1 ? undefined : course.lessons[index + 1];
}

/**
 * Seconds of a lesson a non-buyer may watch: the set preview length; Infinity for an older free lesson
 * that has no length (the whole lesson is free); 0 for a locked one.
 */
export function freePreviewSec(lesson: Lesson): number {
  if (!lesson.isPreview) return 0;
  return lesson.previewSec && lesson.previewSec > 0 ? lesson.previewSec : Number.POSITIVE_INFINITY;
}

/** The length shown for a free-preview lesson: the admin's preview length when it is capped, else the whole lesson. */
export function previewClock(lesson: Lesson): string {
  const cap = freePreviewSec(lesson);
  return Number.isFinite(cap) ? formatClock(cap) : lessonLength(lesson);
}

export function firstPlayableLesson(course: Course): Lesson {
  return course.lessons.find((lesson) => lesson.isPreview) ?? course.lessons[0];
}

/* ------------------------------------------------------------------ *
 * Browse: search and filters run over whatever catalog is passed in.
 * ------------------------------------------------------------------ */

export type SortKey = 'recommended' | 'rating' | 'price-asc' | 'price-desc' | 'shortest';

export type BrowseFilters = {
  categoryIds: string[];
  levels: string[];
  priceBands: string[]; // 'under-1000' | '1000-2500' | 'above-2500'
  durations: string[]; // 'under-2' | '2-4' | 'above-4'
  query: string;
  sort: SortKey;
};

export const emptyFilters: BrowseFilters = {
  categoryIds: [],
  levels: [],
  priceBands: [],
  durations: [],
  query: '',
  sort: 'recommended',
};

export const levelOptions = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const sortOptions: { id: SortKey; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top rated' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'shortest', label: 'Shortest first' },
];

export const priceBandOptions = [
  { id: 'under-1000', label: 'Under ₹1,000' },
  { id: '1000-2500', label: '₹1,000 – ₹2,500' },
  { id: 'above-2500', label: 'Above ₹2,500' },
];

export const durationOptions = [
  { id: 'under-2', label: 'Under 2 hours' },
  { id: '2-4', label: '2 – 4 hours' },
  { id: 'above-4', label: '4 hours and above' },
];

export function browseCourses(courses: Course[], filters: BrowseFilters): Course[] {
  const query = filters.query.trim().toLowerCase();

  const matched = courses.filter((course) => {
    const matchesQuery =
      query.length === 0 ||
      course.title.toLowerCase().includes(query) ||
      course.promise.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.level.toLowerCase().includes(query) ||
      course.outcomes.some((outcome) => outcome.toLowerCase().includes(query));

    const matchesCategory =
      filters.categoryIds.length === 0 || filters.categoryIds.includes(course.categoryId);
    const matchesLevel = filters.levels.length === 0 || filters.levels.includes(course.level);

    const matchesPrice =
      filters.priceBands.length === 0 ||
      filters.priceBands.some((band) =>
        band === 'under-1000'
          ? course.priceInr < 1000
          : band === '1000-2500'
            ? course.priceInr >= 1000 && course.priceInr <= 2500
            : course.priceInr > 2500,
      );

    const matchesDuration =
      filters.durations.length === 0 ||
      filters.durations.some((band) =>
        band === 'under-2' ? course.hours < 2 : band === '2-4' ? course.hours >= 2 && course.hours <= 4 : course.hours > 4,
      );

    return matchesQuery && matchesCategory && matchesLevel && matchesPrice && matchesDuration;
  });

  const sorted = [...matched];
  switch (filters.sort) {
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'price-asc':
      sorted.sort((a, b) => a.priceInr - b.priceInr);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.priceInr - a.priceInr);
      break;
    case 'shortest':
      sorted.sort((a, b) => a.hours - b.hours);
      break;
    default:
      sorted.sort(
        (a, b) =>
          Number(b.isPopular ?? false) - Number(a.isPopular ?? false) ||
          b.rating - a.rating ||
          b.reviewCount - a.reviewCount,
      );
  }
  return sorted;
}
