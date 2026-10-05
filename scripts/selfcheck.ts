/**
 * Runnable self-check for the pure logic in this app. No test framework, no fixtures.
 *
 *   bun run check     # typecheck + this file
 *
 * Covers the helpers that are easy to break silently: Indian mobile normalisation and
 * validation, rupee/clock/duration formatting, and recipe quantity scaling.
 */

import assert from 'node:assert/strict';

declare const Bun: { plugin: (options: unknown) => void } | undefined;

// Bundled images/videos are Metro assets, not runtime files: stub them so the catalog can be
// loaded (and its derived lesson ids/counts verified) outside the app runtime.
if (typeof Bun !== 'undefined') {
  Bun.plugin({
    name: 'asset-stub',
    setup(build: { onLoad: (options: unknown, handler: () => unknown) => void }) {
      build.onLoad({ filter: /\.(jpg|jpeg|png|mp4)$/ }, () => ({ exports: { default: '__asset__' }, loader: 'object' }));
    },
  });
}

import {
  formatClock,
  formatDuration,
  formatIndianMobile,
  formatInr,
  maskPhone,
  normalizePhone,
  scaleQuantity,
  timeOfDayGreeting,
  validateIndianMobile,
} from '../src/lib/format';

let checks = 0;
const queue: (() => void | Promise<void>)[] = [];
function check(name: string, run: () => void | Promise<void>) {
  queue.push(async () => {
    await run();
    checks += 1;
    process.stdout.write(`ok  ${name}\n`);
  });
}

check('formatInr uses Indian digit grouping', () => {
  assert.equal(formatInr(1299), '₹1,299');
  assert.equal(formatInr(2499), '₹2,499');
  assert.equal(formatInr(100000), '₹1,00,000');
});

check('normalizePhone accepts pasted country-code formats', () => {
  assert.equal(normalizePhone('9876543210'), '9876543210');
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.equal(normalizePhone('91-9876543210'), '9876543210');
  assert.equal(normalizePhone('+91 (98765) 43210'), '9876543210');
  assert.equal(normalizePhone('9876'), '9876');
});

check('validateIndianMobile rejects the real failure cases', () => {
  assert.equal(validateIndianMobile('9876543210'), null);
  assert.notEqual(validateIndianMobile('98765'), null, 'short number must fail');
  assert.notEqual(validateIndianMobile('5876543210'), null, 'invalid leading digit must fail');
  assert.notEqual(validateIndianMobile(''), null, 'empty must fail');
});

check('maskPhone never returns the full number', () => {
  const masked = maskPhone('9876543210');
  assert.ok(masked.includes('43210'));
  assert.ok(!masked.includes('98765'), 'first digits must be hidden');
});

check('scaleQuantity scales numbers and leaves text quantities alone', () => {
  assert.equal(scaleQuantity('500 g', 2), '1000 g');
  assert.equal(scaleQuantity('0.5 tsp', 2), '1 tsp');
  assert.equal(scaleQuantity('to taste', 3), 'to taste');
  assert.equal(scaleQuantity('1 cup', 1), '1 cup');
  assert.equal(scaleQuantity('200 g', 0.5), '100 g');
});

check('formatClock and formatDuration match the player and card labels', () => {
  assert.equal(formatClock(125), '2:05');
  assert.equal(formatClock(9), '0:09');
  assert.equal(formatClock(3672), '1:01:12');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatDuration(42), '42m');
  assert.equal(formatDuration(95), '1h 35m');
  assert.equal(formatDuration(120), '2h');
});

check('timeOfDayGreeting covers the day', () => {
  assert.equal(timeOfDayGreeting(new Date('2026-01-01T08:00:00')), 'Good morning');
  assert.equal(timeOfDayGreeting(new Date('2026-01-01T14:00:00')), 'Good afternoon');
  assert.equal(timeOfDayGreeting(new Date('2026-01-01T21:00:00')), 'Good evening');
});

check('catalog derivation produces unique ids and coherent counts', async () => {
  const catalog = await import('../src/data/catalog');
  const allLessons = catalog.courses.flatMap((course) => course.lessons);
  const uniqueIds = new Set(allLessons.map((lesson) => lesson.id));

  assert.equal(catalog.courses.length, 8, 'eight sample courses');
  assert.equal(uniqueIds.size, allLessons.length, 'lesson ids must be unique across the catalog');
  assert.ok(
    allLessons.every((lesson) => catalog.courses.some((course) => course.sections.some((section) => section.id === lesson.sectionId))),
    'every lesson belongs to a section of its course',
  );
  assert.ok(
    catalog.courses.every((course) => course.lessonCount === course.lessons.length && course.hours > 0),
    'lesson counts and durations are derived from the authored lessons',
  );
  assert.ok(
    catalog.courses.some((course) => course.lessons.some((lesson) => lesson.isPreview)),
    'at least one free preview lesson exists',
  );
});

check('search, filters and sorting act on the catalog', async () => {
  const catalog = await import('../src/data/catalog');

  assert.deepEqual(
    catalog.browseCourses({ ...catalog.emptyFilters, query: 'biryani' }).map((course) => course.id),
    ['biryani'],
  );
  assert.deepEqual(
    catalog.browseCourses({ ...catalog.emptyFilters, query: 'armchair' }),
    [],
    'a query with no match returns no results, so the empty state is reachable',
  );
  assert.deepEqual(
    catalog.browseCourses({ ...catalog.emptyFilters, categoryIds: ['baking'] }).map((course) => course.id),
    ['baking-basics'],
  );

  const cheap = catalog.browseCourses({ ...catalog.emptyFilters, priceBands: ['under-1000'], sort: 'price-asc' });
  assert.ok(cheap.length > 0 && cheap.every((course) => course.priceInr < 1000));
  assert.deepEqual(
    cheap.map((course) => course.priceInr),
    [...cheap.map((course) => course.priceInr)].sort((a, b) => a - b),
    'price ascending is respected',
  );

  const shortest = catalog.browseCourses({ ...catalog.emptyFilters, sort: 'shortest' });
  assert.equal(shortest[0].hours, Math.min(...catalog.courses.map((course) => course.hours)));
});

void formatIndianMobile;

for (const run of queue) await run();

process.stdout.write(`\n${checks} checks passed\n`);
