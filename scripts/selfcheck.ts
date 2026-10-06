/**
 * Runnable self-check for the pure logic in this app. No test framework, no fixtures.
 *
 *   bun run check     # typecheck + this file
 *
 * Covers the helpers that are easy to break silently: Indian mobile normalisation and
 * validation, rupee/clock/duration formatting, and recipe quantity scaling.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  ageFromDateOfBirth,
  buildDateOfBirth,
  formatClock,
  formatDuration,
  formatIndianMobile,
  formatDateOfBirth,
  formatInr,
  maskPhone,
  normalizePhone,
  scaleQuantity,
  timeOfDayGreeting,
  validateEmail,
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
  const { courseLessonGroups } = catalog;
  const allLessons = catalog.courses.flatMap((course) => course.lessons);
  const uniqueIds = new Set(allLessons.map((lesson) => lesson.id));

  assert.equal(catalog.courses.length, 8, 'eight sample courses');
  assert.ok(
    catalog.courses.every((course) => catalog.categories.some((category) => category.id === course.categoryId)),
    'every course belongs to one of the dairy tracks',
  );
  const offDomain = /biryani|thali|roti|knife skills|baking basics/i;
  assert.ok(
    catalog.courses.every((course) => !offDomain.test(`${course.title} ${course.promise} ${course.description}`)),
    'no cooking-course content is left in the dairy catalog',
  );
  assert.equal(uniqueIds.size, allLessons.length, 'lesson ids must be unique across the catalog');
  assert.ok(
    allLessons.every(
      (lesson) =>
        lesson.sectionId === null ||
        catalog.courses.some((course) => course.sections.some((section) => section.id === lesson.sectionId)),
    ),
    'every lesson is either inside a section of its course or a standalone lesson',
  );
  assert.ok(
    catalog.courses.some(
      (course) => course.sections.length > 0 && course.lessons.some((lesson) => lesson.sectionId === null),
    ),
    'a course mixes sections with standalone lessons, so both authoring options are in use',
  );
  assert.ok(
    catalog.courses.every((course) => courseLessonGroups(course).flatMap((group) => group.lessons).length === course.lessonCount),
    'the grouped curriculum covers every lesson exactly once',
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
    catalog.browseCourses({ ...catalog.emptyFilters, query: 'paneer' }).map((course) => course.id),
    ['paneer-craft'],
  );
  assert.deepEqual(
    catalog.browseCourses({ ...catalog.emptyFilters, query: 'armchair' }),
    [],
    'a query with no match returns no results, so the empty state is reachable',
  );
  assert.deepEqual(
    catalog.browseCourses({ ...catalog.emptyFilters, categoryIds: ['cheese'] }).map((course) => course.id),
    ['artisan-cheese'],
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

// --- Worklet safety -------------------------------------------------------------------------
// Reanimated compiles the arguments of withTiming/withSpring/withRepeat/withDecay/withSequence for
// the UI runtime. A JS callback passed as the completion argument therefore runs as a worklet, and
// calling a React state setter from it throws
//   "[Worklets] Tried to synchronously call a Remote Function. Called \"bound dispatchSetState\"…"
// on device (the web build silently degrades, so a green web run is NOT evidence). Guard against
// reintroducing that pattern anywhere in src/.
const ANIMATION_CALL = /\bwith(Timing|Spring|Repeat|Decay|Sequence)\s*\(/g;
// Hook bodies are also compiled to the UI runtime; touching React state there throws the same way.
const WORKLET_HOOK = /\b(useAnimatedStyle|useDerivedValue|useAnimatedReaction)\s*\(/g;
const REACT_STATE_CALL = /\bset[A-Z][A-Za-z0-9_]*\s*\(|\bdispatch[A-Z][A-Za-z0-9_]*\s*\(/;

function scanWorkletCallbacks(): string[] {
  const offenders: string[] = [];
  const root = fileURLToPath(new URL('../src', import.meta.url));
  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(child);
      return /\.(ts|tsx)$/.test(entry.name) ? [child] : [];
    });
  };

  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const lineAt = (index: number) => source.slice(0, index).split('\n').length;
    for (const match of source.matchAll(ANIMATION_CALL)) {
      const start = match.index + match[0].length - 1; // at '('
      let depth = 0;
      let end = start;
      for (let i = start; i < source.length; i += 1) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') {
          depth -= 1;
          if (depth === 0) { end = i; break; }
        }
      }
      const args = source.slice(start + 1, end);
      if (!/=>/.test(args)) continue; // no callback at all — always safe
      if (/runOnJS\s*\(|scheduleOnRN\s*\(/.test(args)) continue; // correctly hop to the JS thread
      const stateCall = args.match(REACT_STATE_CALL);
      offenders.push(
        `${file.split('/src/')[1]}:${lineAt(match.index)} with${match[1]}() callback${
          stateCall ? ` -> ${stateCall[0]}` : ' -> a plain JS function'
        }`,
      );
    }
  }

  // Second and third passes: worklet hook bodies that call a React state setter, a dispatcher, or a
  // function that this file defines without marking it as a worklet. Everything in a hook body runs on
  // the UI runtime, where a plain function from the module is a *Remote Function*: calling it throws
  //
  //   [Worklets] Tried to synchronously call a Remote Function. Called "clamp" on the UI Runtime.
  //
  // which took the whole screen down on device while web silently degraded. Reanimated's own helpers
  // (imported) and Math are fine, so only same-file declarations are flagged.
  const hookFiles = walk(root);
  for (const file of hookFiles) {
    const source = readFileSync(file, 'utf8');
    const lineAt = (index: number) => source.slice(0, index).split('\n').length;
    const localHelpers = new Set<string>();
    for (const decl of source.matchAll(
      /(?:^|\n)(?:export\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\())/g,
    )) {
      const name = decl[1] ?? decl[2];
      // A worklet directive ('worklet') before the declaration makes the call legal.
      const before = source.slice(Math.max(0, decl.index - 120), decl.index);
      if (/'worklet';|"worklet";/.test(before)) continue;
      localHelpers.add(name);
    }
    // Helpers that are themselves worklets are safe wherever they are called.
    for (const decl of source.matchAll(/'worklet';\s*(?:export\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/g)) {
      localHelpers.delete(decl[1] ?? decl[2] ?? '');
    }
    if (localHelpers.size === 0) continue;

    for (const match of source.matchAll(WORKLET_HOOK)) {
      const start = match.index + match[0].length - 1;
      let depth = 0;
      let end = start;
      for (let i = start; i < source.length; i += 1) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') {
          depth -= 1;
          if (depth === 0) { end = i; break; }
        }
      }
      const body = source.slice(start + 1, end);
      const stateCall = body.match(REACT_STATE_CALL);
      if (stateCall) {
        const at = match.index + match[0].length - 1 + stateCall.index!;
        offenders.push(`${file.split('/src/')[1]}:${lineAt(at)} ${match[1]}() -> ${stateCall[0]}()`);
      }
      for (const call of body.matchAll(/(?:^|[^\w.$])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const name = call[1];
        if (!localHelpers.has(name)) continue;
        const at = match.index + match[0].length - 1 + call.index!;
        offenders.push(
          `${file.split('/src/')[1]}:${lineAt(at)} ${match[1]}() -> ${name}() is a plain function in this file, not a worklet`,
        );
      }
    }
  }
  return offenders;
}

check('worklet callbacks and hook bodies never touch React state', () => {
  const offenders = scanWorkletCallbacks();
  assert.deepEqual(
    offenders,
    [],
    `these run on the UI runtime but touch React state — hop to the JS thread (runOnJS) or use a timer instead:\n  ${offenders.join('\n  ')}`,
  );
});

check('policy screens carry their own title, and language is a screen of its own', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

  // The three policies are separate destinations linked from Profile, so no policy page may grow a tab
  // strip across the top again (that is what the screen used to have).
  const legal = read('src/app/legal.tsx');
  assert.ok(!/Segmented/.test(legal), 'the policy screen renders one document, without a tab strip');
  assert.ok(/AppBar title=\{t\(document\.title\)\}/.test(legal), 'the app bar carries the document title');
  assert.ok(/legalDocs\[key\]/.test(legal), 'the document still comes from the route parameter');

  // Language is a row that opens a screen, not two tabs squeezed into the Profile card.
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.ok(/router\.push\('\/language'\)/.test(profile), 'Profile links to the language screen');
  assert.ok(!/LanguagePicker/.test(profile), 'the inline language tabs are gone from Profile');

  const language = read('src/app/language.tsx');
  for (const needle of ['accessibilityRole="radio"', 'accessibilityState={{ checked: active }}', 'aria-checked={active}', 'setLanguage(language.id)']) {
    assert.ok(language.includes(needle), `language screen keeps ${needle}`);
  }
});

check('screen scrollers are clipped and headers paint over them', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
  const ui = read('src/components/ui.tsx');

  // Android draws a ScrollView's children past its own edges: a row scrolling out of view rides up
  // over the header next to it, which reads as the content striking through the search field. The
  // header is therefore painted *after* the scroller and pinned over the top of the screen, and the
  // content is padded down by the header's measured height so it still starts below it at rest.
  assert.ok(/clipping: \{ overflow: 'hidden' \}/.test(ui), 'the scroller keeps its clipping style');
  assert.ok(
    /headerOverlay: \{[\s\S]{0,220}?position: 'absolute'/.test(ui),
    'the header is pinned over the scroller',
  );
  assert.ok(ui.includes('styles.headerOverlay'), 'the header renders in that overlay');
  assert.ok(
    ui.includes('setHeaderHeight(Math.round(event.nativeEvent.layout.height))'),
    'the overlay measures itself so the content can be padded',
  );
  assert.ok(
    ui.includes('header ? { paddingTop: headerHeight + contentPaddingTop } : null'),
    'the content keeps a top padding the size of the header (plus whatever the screen asked for)',
  );

  // The screens that own a scroller put the same overflow on it themselves.
  for (const screen of ['src/app/auth/phone.tsx', 'src/app/auth/otp.tsx', 'src/app/lesson/[courseId]/[lessonId].tsx']) {
    assert.ok(read(screen).includes('style={scrollClip}'), `${screen} keeps its scroller clipped`);
  }
  assert.ok(
    /export const scrollClip: ViewStyle = \{ flex: 1, overflow: 'hidden' \}/.test(ui),
    'scrollClip still hides the overflow',
  );
});

check('a bought course can be rated, and the rating stays on the device', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

  // The rating lives in the persisted state, so it survives a reload like progress and notes do.
  const store = read('src/store.tsx');
  assert.ok(/ratings: Record<Id, CourseRating>/.test(store), 'ratings are part of the stored state');
  assert.ok(store.includes('ratingFor: (courseId) => state.ratings[courseId] ?? null'), 'the store can read one back');
  assert.ok(store.includes('ratings: { ...prev.ratings, [rating.courseId]: rating }'), 'the store can write one');

  const rate = read('src/app/rate/[courseId].tsx');
  assert.ok(rate.includes('useLocalSearchParams<{ courseId: string }>'), 'the screen takes the course from the route');
  assert.ok(rate.includes('if (!isEnrolled(course.id))'), 'only a course the learner owns can be rated');
  assert.ok(rate.includes('setRating({'), 'submitting writes the rating');
  assert.ok(
    rate.includes("t('This prototype keeps your rating on this device. Nothing is sent anywhere.')"),
    'the screen says the rating is local instead of implying a server took it',
  );

  // Two ways in: the course page it belongs to, and the finished course in My learning.
  assert.ok(read('src/app/course/[id].tsx').includes("pathname: '/rate/[courseId]'"), 'the course page links to it');
  assert.ok(read('src/app/(tabs)/learning.tsx').includes("pathname: '/rate/[courseId]'"), 'My learning links to it');

  // The stars are a radio group for screen readers, and every star is its own target.
  const input = read('src/components/rating-input.tsx');
  assert.ok(input.includes('accessibilityRole="radiogroup"'), 'the star row is a group');
  assert.ok(input.includes('accessibilityRole="radio"'), 'each star is a radio');
  assert.ok(input.includes('minHeight: layout.touchTarget'), 'each star keeps the 44pt target');
});

check('every UI string has a Hindi translation, and no entry is orphaned', async () => {
  const [catalog, payments, content, i18n, hindi] = await Promise.all([
    import('../src/data/catalog'),
    import('../src/services/payments'),
    import('../src/data/content'),
    import('../src/i18n'),
    import('../src/i18n/hi'),
  ]);
  const { hi } = hindi;

  const root = fileURLToPath(new URL('../src', import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(child);
      return entry.name.endsWith('.tsx') ? [child] : [];
    });

  const used = new Set<string>();
  for (const file of [...walk(`${root}/app`), ...walk(`${root}/components`)]) {
    // Comments come out first: the doc comments here mention t('Saved') as prose, not as a call site.
    const source = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    // A literal like 'Loading lesson\u2026' is a *key* with an ellipsis in it at runtime, so the escapes
    // are evaluated here too — otherwise these seven keys would look untranslated forever.
    const unescape = (value: string) =>
      value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    for (const match of source.matchAll(/(?<![\w$.])t\(\s*(['"])(.*?)\1/g)) used.add(unescape(match[2]));
  }

  // Labels that live in data and are translated where they are rendered — t(option.label) — rather than
  // as literals in a screen. The catalog's own content (titles, lessons, batch sheets) stays English.
  const today = new Date(2026, 9, 5);
  const dataKeys = [
    ...catalog.categories.map((category) => category.label),
    ...catalog.levelOptions,
    ...catalog.sortOptions.map((option) => option.label),
    ...catalog.priceBandOptions.map((option) => option.label),
    ...catalog.durationOptions.map((option) => option.label),
    ...payments.demoScenarios.flatMap((scenario) => [scenario.label, scenario.help]),
    ...content.purchaseTerms,
    ...content.ratingWords,
    ...content.ratingHighlights,
    // The one message the demo gateway returns (src/services/payments.ts).
    'The demo gateway declined this payment. No money moved.',
    // Date-of-birth problems, which the profile sheet renders through t(error) (src/lib/format.ts).
    buildDateOfBirth('31', '02', '1996', today).error!,
    buildDateOfBirth('05', '10', '2030', today).error!,
    buildDateOfBirth('05', '10', '2020', today).error!,
    buildDateOfBirth('05', '10', '1890', today).error!,
  ];
  dataKeys.push(...i18n.LANGUAGES.map((language) => language.description));
  for (const key of dataKeys) used.add(key);

  const missing = [...used].filter((key) => !(key in hi)).sort();
  assert.deepEqual(missing, [], `these strings have no Hindi entry:\n  ${missing.join('\n  ')}`);

  const orphans = Object.keys(hi)
    .filter((key) => !used.has(key))
    .sort();
  assert.deepEqual(orphans, [], `these Hindi entries are not used by any screen:\n  ${orphans.join('\n  ')}`);

  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)]
      .map((match) => match[1])
      .sort()
      .join(',');
  const brokenPlaceholders = Object.keys(hi)
    .filter((key) => placeholders(key) !== placeholders(hi[key]))
    .map((key) => `${key} -> ${hi[key]}`);
  assert.deepEqual(brokenPlaceholders, [], `these entries changed the placeholders:\n  ${brokenPlaceholders.join('\n  ')}`);

  // The switch itself: English is the source string, Hindi answers out of the dictionary, and a
  // placeholder reaches the sentence instead of being left as braces.
  assert.equal(i18n.translate('en', 'Saved'), 'Saved');
  assert.equal(i18n.translate('hi', 'Saved'), hi['Saved']);
  assert.notEqual(hi['Saved'], 'Saved');
  assert.equal(i18n.translate('hi', '{n} lessons', { n: 3 }), hi['{n} lessons'].replace('{n}', '3'));
});

check('profile fields validate email and date of birth', () => {
  assert.equal(validateEmail(''), null);
  assert.equal(validateEmail('deepak@example.com'), null);
  assert.ok(validateEmail('deepak@example'));
  assert.ok(validateEmail('deepak example.com'));

  const today = new Date(2026, 9, 5); // 5 October 2026
  assert.equal(ageFromDateOfBirth('1996-03-12', today), 30);
  assert.equal(ageFromDateOfBirth('1996-10-05', today), 30);
  assert.equal(ageFromDateOfBirth('1996-10-06', today), 29);
  assert.equal(ageFromDateOfBirth('1996-02-30', today), null);
  assert.equal(formatDateOfBirth('1996-03-12'), '12 March 1996');
  assert.equal(formatDateOfBirth(undefined), null);

  assert.deepEqual(buildDateOfBirth('', '', '', today), { ok: false, error: null });
  assert.equal(buildDateOfBirth('12', '', '1996', today).ok, false);
  // One-digit month/day is accepted on purpose: "3" means March.
  assert.deepEqual(buildDateOfBirth('12', '3', '1996', today), { ok: true, date: '1996-03-12' });
  assert.deepEqual(buildDateOfBirth('12', '03', '1996', today), { ok: true, date: '1996-03-12' });
  assert.deepEqual(buildDateOfBirth('31', '02', '1996', today), { ok: false, error: 'That date does not exist.' });
  assert.equal(buildDateOfBirth('05', '10', '2030', today).ok, false);
  assert.equal(buildDateOfBirth('05', '10', '2020', today).ok, false);
  assert.equal(buildDateOfBirth('05', '10', '1890', today).ok, false);
});

void formatIndianMobile;

for (const run of queue) await run();

process.stdout.write(`\n${checks} checks passed\n`);
