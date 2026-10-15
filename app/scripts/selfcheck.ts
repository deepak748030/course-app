/**
 * Runnable self-check for the pure logic in this app. No test framework, no fixtures.
 *
 *   bun run check     # typecheck + this file
 *
 * Covers the helpers that are easy to break silently: Indian mobile normalisation and
 * validation, rupee/clock/duration formatting, and recipe quantity scaling.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { decodePng } from './png.mjs';

declare const Bun: { plugin: (options: unknown) => void } | undefined;

// Bundled images/videos are Metro assets, not runtime files: stub them so the catalog can be
// loaded (and its derived lesson ids/counts verified) outside the app runtime.
if (typeof Bun !== 'undefined') {
  Bun.plugin({
    name: 'app-runtime-stubs',
    setup(build: {
      onLoad: (options: unknown, handler: () => unknown) => void;
      onResolve: (options: unknown, handler: () => { path: string } | undefined) => void;
    }) {
      build.onLoad({ filter: /\.(jpg|jpeg|png|mp4)$/ }, () => ({ exports: { default: '__asset__' }, loader: 'object' }));
      build.onResolve({ filter: /^react-native$/ }, () => ({
        path: new URL('./selfcheck-stubs/react-native.ts', import.meta.url).pathname,
      }));
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

check('the server catalog maps onto the app types coherently', async () => {
  const { mapCourse } = await import('../src/services/catalogService');
  const { discountPercent, firstPlayableLesson, nextLesson } = await import('../src/lib/catalog');

  const fixture = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'milk-foundations',
    title: 'Milk Foundations',
    promise: 'Buy, chill, test and store milk.',
    description: 'The course every other track assumes.',
    coverUrl: 'https://example.com/cover.jpg',
    category: { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'milk', label: 'Milk handling', icon: 'Milk', sortOrder: 1 },
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1999,
    listPriceInr: 2999,
    published: true,
    isPopular: true,
    isBeginnerPick: true,
    rating: 4.8,
    reviewCount: 10,
    outcomes: ['Judge milk quality'],
    equipment: ['Lactometer'],
    audience: 'Dairy owners',
    lessons: [
      { _id: 'l1', title: 'The reception check', description: '', minutes: 14, isPreview: true, recipe: null },
      { _id: 'l2', title: 'Fat and SNF', description: '', minutes: 16, isPreview: false, recipe: null },
      { _id: 'l3', title: 'The chilling curve', description: '', minutes: 18, isPreview: false, recipe: {
        title: 'Bulk chill batch', servings: 2, prepMinutes: 5, cookMinutes: 0,
        ingredients: [{ item: 'Milk', quantity: '10 L' }], steps: ['Chill fast.'], tips: ['Watch the curve.'],
      }},
    ],
    lessonCount: 3,
    totalMinutes: 48,
  } as never;

  const course = mapCourse(fixture);
  assert.equal(course.id, 'milk-foundations', 'the slug stays the app-side id');
  assert.equal(course.remoteId, 'aaaaaaaaaaaaaaaaaaaaaaaa', 'the Mongo id rides along for API calls');
  assert.equal(course.categoryId, 'milk', 'the category comes through by slug');
  assert.equal(course.hours, 0.8, 'hours derive from the server minutes');
  assert.equal(discountPercent(course), 33, 'the offer badge math survives the mapping');
  assert.equal(firstPlayableLesson(course).id, 'l1', 'the preview lesson leads');
  assert.equal(nextLesson(course, 'l1')?.id, 'l2', 'next-lesson navigation works on mapped lessons');

  assert.equal(course.lessons.length, 3, 'every lesson comes through as one flat curriculum');
  const ids = course.lessons.map((lesson) => lesson.id);
  assert.equal(new Set(ids).size, ids.length, 'lesson ids stay unique through the mapping');
  assert.ok(course.lessons.every((lesson) => lesson.recipe === undefined || lesson.recipe.steps.length > 0),
    'recipes map through with their steps');
});

check('search, filters and sorting act on any catalog', async () => {
  const { browseCourses, emptyFilters } = await import('../src/lib/catalog');
  const { mapCourse } = await import('../src/services/catalogService');

  const make = (slug: string, priceInr: number, minutes: number, extra: Record<string, unknown> = {}) =>
    mapCourse({
      _id: slug.padEnd(24, 'a'), slug, title: slug.replace(/-/g, ' '), promise: '', description: '',
      coverUrl: '', category: { _id: 'x'.padEnd(24, 'b'), slug: 'milk', label: 'Milk handling', icon: 'Milk', sortOrder: 1 },
      level: 'Beginner', language: 'English', priceInr, listPriceInr: null, published: true,
      isPopular: false, isBeginnerPick: false, rating: 4.5, reviewCount: 10,
      outcomes: [], equipment: [], audience: '',
      lessons: [{ _id: `${slug}-l1`, title: 'A lesson', description: '', minutes, isPreview: false, recipe: null }],
      lessonCount: 1, totalMinutes: minutes,
      ...extra,
    } as never);

  const courses = [
    make('paneer-craft', 2999, 60, { isPopular: true, rating: 4.9 }),
    make('milk-foundations', 1999, 45),
    make('artisan-cheese', 3999, 120),
  ];

  assert.deepEqual(browseCourses(courses, { ...emptyFilters, query: 'paneer' }).map((course) => course.id), ['paneer-craft']);
  assert.deepEqual(browseCourses(courses, { ...emptyFilters, query: 'armchair' }), [], 'no match is an empty list');

  const cheap = browseCourses(courses, { ...emptyFilters, priceBands: ['1000-2500'], sort: 'price-asc' });
  assert.deepEqual(cheap.map((course) => course.id), ['milk-foundations']);

  const shortest = browseCourses(courses, { ...emptyFilters, sort: 'shortest' });
  assert.equal(shortest[0].id, 'milk-foundations', 'shortest first reads the mapped hours');

  const recommended = browseCourses(courses, { ...emptyFilters });
  assert.equal(recommended[0].id, 'paneer-craft', 'popular and top-rated lead the recommended sort');
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
  for (const screen of ['src/app/auth/otp.tsx', 'src/app/lesson/[courseId]/[lessonId].tsx']) {
    assert.ok(read(screen).includes('scrollClip'), `${screen} keeps its scroller clipped`);
  }
  assert.ok(
    /export const scrollClip: ViewStyle = \{ flex: 1, overflow: 'hidden' \}/.test(ui),
    'scrollClip still hides the overflow',
  );
});

check('every brand icon is cut from the supplied logo.png', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
  const pixels = (relative: string) =>
    decodePng(readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url))));

  // The in-app vector mark keeps its geometry: headers, tiles and footers draw it at small sizes.
  const marks = read('src/components/marks.tsx');
  for (const geometry of [
    'M 424 244 C 392 274 372 312 366 352 L 358 558 Q 358 596 396 596 L 604 596 Q 642 596 642 558 L 634 352 C 628 312 608 274 576 244 Z',
    'M 440 252 L 380 252 Q 332 252 332 300 L 332 382 Q 332 430 380 430 L 428 430',
    'M 438 330 Q 232 366 106 646 Q 318 622 438 330 Z',
    'M 196 584 Q 306 470 408 372',
    'M 430 188 L 570 188 L 578 246 L 422 246 Z',
  ]) {
    assert.ok(marks.includes(geometry), `marks.tsx draws ${geometry.slice(0, 22)}…`);
  }

  // The icon set, though, is no longer a second drawing of the logo: the generator reads the supplied
  // artwork and cuts every size out of those pixels, so the favicon, the launcher icons and the splash
  // cannot drift away from the logo the app shows everywhere else.
  const generator = read('scripts/generate-brand-icons.mjs');
  assert.ok(generator.includes("resolve(IMAGE_DIR, 'logo.png')"), 'the generator reads the supplied logo.png');
  for (const output of [
    'favicon.png',
    'splash-icon.png',
    'android-icon-background.png',
    'android-icon-foreground.png',
    'android-icon-monochrome.png',
    'brand-mark.png',
  ]) {
    assert.ok(generator.includes(`'${output}'`), `the generator writes ${output}`);
  }

  // The in-app lockup uses the supplied logo asset rather than a second drawing of the name.
  assert.ok(marks.includes('export function BrandLockup'), 'the app can show the full logo');
  assert.ok(marks.includes('images.brandLogo'), 'the lockup reads the registered logo asset');
  assert.ok(
    /brandLogo: require\('@\/assets\/images\/logo\.png'\)/.test(read('src/media.ts')),
    'the supplied logo.png is registered for the in-app lockup',
  );
  assert.ok(read('app.json').includes('"icon": "./assets/images/logo.png"'), 'the app icon uses logo.png');
  // Where the supplied file is shown in the app itself: the boot screen, the sign-in hero and the
  // home header show the whole lockup; the small spots (the footer, the brand row) use the same
  // artwork with the wordmark cut away, because a 14px "ACADEMY" is not a word, it is a smudge.
  assert.ok(read('src/app/index.tsx').includes('<BrandLockup'), 'the boot screen uses it');
  assert.ok(!read('src/app/auth/phone.tsx').includes('<BrandMark'), 'the phone sign-in screen carries no brand placeholder');
  assert.ok(read('src/app/(tabs)/home.tsx').includes('images.brandMark'), 'and the home header');
  assert.ok(read('src/app/(tabs)/home.tsx').includes('images.brandMark'), 'the footer uses brand-mark.png');
  assert.ok(
    read('src/app/onboarding.tsx').includes('source={images.brandMark}'),
    'the onboarding brand row shows the same brand-mark.png artwork as the home header',
  );
  assert.ok(
    !read('src/components/ui.tsx').includes('BrandTile'),
    'nothing tints the mark into a coloured tile any more — the logo brings its own colours',
  );

  // The icon set itself: every size the platforms ask for, written by the generator.
  for (const file of [
    'assets/images/android-icon-foreground.png',
    'assets/images/android-icon-background.png',
    'assets/images/android-icon-monochrome.png',
    'assets/images/favicon.png',
    'assets/images/splash-icon.png',
    'assets/images/logo.png',
    'assets/images/brand-mark.png',
  ]) {
    assert.ok(existsSync(fileURLToPath(new URL(`../${file}`, import.meta.url))), `${file} exists`);
  }

  // Pixel proof that the icons are the logo and not a lookalike: every opaque one carries the logo's
  // own centre, and each keeps the background its role demands (badge green for the favicon, plain
  // white for the splash), at every size the platforms ask for.
  type Pixels = { width: number; height: number; data: Uint8Array };
  const at = (image: Pixels, x: number, y: number) => {
    const o = (y * image.width + x) * 4;
    return [image.data[o], image.data[o + 1], image.data[o + 2], image.data[o + 3]];
  };
  const close = (a: number[], b: number[], tolerance = 14) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);

  const logo = pixels('assets/images/logo.png');
  const field = at(logo, 0, 0);
  const centre = at(logo, logo.width >> 1, logo.height >> 1);

  for (const [file, size] of [
    ['assets/images/favicon.png', 196],
    ['assets/images/splash-icon.png', 512],
  ]) {
    const icon = pixels(file);
    assert.equal(icon.width, size, `${file} is ${size}px wide`);
    assert.equal(icon.height, size, `${file} is ${size}px tall`);
    assert.ok(close(at(icon, size >> 1, size >> 1), centre), `${file} keeps the logo's centre`);
  }
  // The favicon is the badge, so the logo's green field fills its corners. The splash is the lockup
  // on the plain white splash background: its corners are that white, and the green lives only in
  // the artwork — never in the field around it.
  const faviconPixels = pixels('assets/images/favicon.png');
  assert.ok(close(at(faviconPixels, 0, 0), field, 2), 'the favicon keeps the logo field green in its corner');
  const splashPixels = pixels('assets/images/splash-icon.png');
  assert.ok(
    close(at(splashPixels, 0, 0), [255, 255, 255, 255], 2),
    'the splash corners are the white splash background, not a green field'
  );

  // The Android pair composes back to the logo: the flat field behind the disc with its field keyed
  // out, plus a white silhouette of the artwork for themed icons.
  const background = pixels('assets/images/android-icon-background.png');
  for (const [x, y] of [
    [0, 0],
    [216, 216],
    [431, 431],
  ]) {
    assert.ok(close(at(background, x, y), field, 2), 'the adaptive background is the logo field, flat');
  }
  const foreground = pixels('assets/images/android-icon-foreground.png');
  assert.equal(at(foreground, 0, 0)[3], 0, 'the adaptive foreground drops the corner field');
  assert.equal(at(foreground, 216, 216)[3], 255, 'and keeps the disc opaque');
  assert.ok(close(at(foreground, 216, 216), centre), 'with the logo at its centre');
  const mono = pixels('assets/images/android-icon-monochrome.png');
  assert.equal(at(mono, 0, 0)[3], 0, 'the monochrome layer is transparent outside the artwork');
  assert.deepEqual(at(mono, 216, 216), [255, 255, 255, 255], 'and a white silhouette where the churn is');
  const mark = pixels('assets/images/brand-mark.png');
  assert.equal(at(mark, 0, 0)[3], 0, 'the text-free mark sits on transparent');
  assert.equal(at(mark, mark.width >> 1, mark.height >> 1)[3], 255, 'with the churn opaque at its centre');


});

check('every onboarding slide fills the window, and the poster leads it', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

  const screen = read('src/app/onboarding.tsx');
  const slideKeys = [...screen.matchAll(/^\s{4}key: '([^']+)'/gm)].map((match) => match[1]);
  assert.deepEqual(slideKeys, ['poster', 'milk', 'bench'], 'onboarding contains exactly three slides');
  assert.ok(/key: 'bench'[\s\S]*?cta: 'Start learning'/.test(screen), 'the final slide has its finishing action');

  // The artwork is the screen: `cover` on a full-window box, in a pager that is absolute-filled, so
  // no slide can end up letterboxed (which is what a `contain` image with page padding did).
  assert.ok(screen.includes('contentFit="cover"'), 'the artwork is cropped to fill, never letterboxed');
  // The brand row's small logo is the one image shown whole on purpose: a logo is never cropped.
  const slideArt = screen.replace(/<Image source=\{images\.brandMark\}[^>]*\/>/g, '');
  assert.ok(!/contentFit="contain"/.test(slideArt), 'no slide falls back to a letterboxed image');
  assert.ok(
    /canvas: \{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 \}/.test(screen),
    'the pager covers the whole window, status bar included',
  );
  assert.ok(screen.includes('styles.topFade'), 'a fade keeps the brand row legible over any photo');
  assert.ok(screen.includes('styles.bottomScrim'), 'and a scrim keeps the white copy legible at the foot');

  // Positions come from measurements, not from magic numbers.
  assert.ok(screen.includes('setFooterHeight('), 'the footer reports its height');
  assert.ok(screen.includes('bottom: footerInset + spacing.sm'), 'the copy clears the measured footer');

  // The poster still leads the flow, and nothing is written over it: its name and tagline are printed
  // in the artwork itself, so an overlay lock-up only doubled the lettering on the image.
  assert.ok(screen.includes('poster: true'), 'the first slide is marked as a poster');
  assert.ok(screen.indexOf("key: 'poster'") < screen.indexOf("key: 'milk'"), 'and it is the first one');
  assert.ok(screen.includes('posterLabel'), 'the poster is described to screen readers instead of overlaid');
  for (const overlay of ['posterTitle', 'posterTagline', 'posterLockup', 'posterPlate', 'posterRule']) {
    assert.ok(!screen.includes(overlay), `no ${overlay} is drawn over the poster artwork`);
  }
  assert.ok(
    /onboardingPoster: require\('@\/assets\/images\/onboarding-ydu-poster\.jpg'\)/.test(read('src/media.ts')),
    'the poster asset is registered',
  );
});

check('a bought course can be rated locally and posted to the server', () => {
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
  assert.ok(rate.includes('api.submitReview('), 'and it posts the review to the academy server');

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
  const [helpers, content, i18n, hindi] = await Promise.all([
    import('../src/lib/catalog'),
    import('../src/data/content'),
    import('../src/i18n'),
    import('../src/i18n/hi'),
  ]);
  const { hi } = hindi;
  const { THEMES } = await import('../src/constants/theme');

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
  // Category labels live on the server now; the seeded set is listed here so the dictionary
  // stays complete for what the academy actually ships.
  const categoryLabels = [
    'Milk handling',
    'Paneer & chhana',
    'Ghee & butter',
    'Curd & ferments',
    'Cheese',
    'Frozen desserts',
    'Farm & animals',
    'Dairy business',
  ];
  const dataKeys = [
    ...categoryLabels,
    ...helpers.levelOptions,
    ...helpers.sortOptions.map((option) => option.label),
    ...helpers.priceBandOptions.map((option) => option.label),
    ...helpers.durationOptions.map((option) => option.label),
    ...content.purchaseTerms,
    ...content.ratingWords,
    ...content.ratingHighlights,
    // The two theme names and their descriptions, rendered through t() by the picker on Profile.
    ...THEMES.flatMap((theme) => [theme.label, theme.description]),
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

check('green is the default look, the number is read-only, and policy copy is small print', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

  // The app opens on the green-and-white look; yellow is still one tap away on Profile.
  const theme = read('src/constants/theme.ts');
  assert.ok(/export const DEFAULT_THEME: ThemeId = 'green'/.test(theme), 'green is the default theme');
  assert.ok(
    /THEMES[\s\S]{0,200}?\{ id: 'green'/.test(theme),
    'the picker lists the default first, so the selected row is the top one',
  );
  // Changing the default has to reach an install that already stored the old one: a stored theme only
  // wins when the learner picked it themselves.
  const store = read('src/store.tsx');
  assert.ok(store.includes('themeChosen'), 'the store records whether a theme was chosen by hand');
  assert.ok(
    /themeChosen === true && isThemeId\(merged\.theme\) \? merged\.theme : DEFAULT_THEME/.test(store),
    'an unchosen stored theme falls back to the current default',
  );

  // The mobile number is the sign-in identity: not on Profile, and not an input in the editor.
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.ok(!/Mobile number/.test(profile), 'Profile does not show the number');
  assert.ok(!/maskPhone/.test(profile), 'and it does not mask one either');
  assert.ok(
    !/Add your details/.test(profile),
    'Profile has no details card to fill in: the pencil in the header opens the sheet',
  );
  assert.ok(
    /hasDetails \?/.test(profile),
    'and the details card is skipped entirely while there is nothing to show',
  );

  const editor = read('src/components/profile-editor.tsx');
  assert.ok(
    editor.includes('formatIndianMobile(normalizePhone(profile.phone))'),
    'the editor shows the number, country code normalised',
  );
  assert.ok(!/value=\{profile\.phone\}/.test(editor), 'but never as an editable field');
  assert.ok(editor.includes('cannot be changed here'), 'and it says why');

  // The policy documents are set as documents: the 12pt step of the scale for body copy, opened up,
  // with clause headings at 15 and the document title at 19 — and the text sits on 8pt side padding.
  for (const screen of ['src/app/legal.tsx', 'src/app/help.tsx']) {
    const source = read(screen);
    assert.ok(
      /fontSize: type\.label\.fontSize/.test(source),
      `${screen} sets its body copy on the small-print step`,
    );
    assert.ok(/lineHeight: 19/.test(source), `${screen} opens that step up for reading`);
    assert.ok(!/paddingHorizontal: layout\.section/.test(source), `${screen} uses the 8pt side padding`);
  }
  const legal = read('src/app/legal.tsx');
  assert.ok(legal.includes('type.subheading'), 'the document title is one step below the app bar');
  assert.ok(legal.includes('type.bodyStrong'), 'clause headings are the 15pt step');
  const content = read('src/data/content.ts');
  assert.ok(content.includes('points?: readonly string[]'), 'clauses can carry bullet points');
  assert.ok(/heading: 'What we do not do',\s*\n\s*points:/.test(content), 'and the copy uses them');
});

check('the offer mark is plain text, and it owns the card corner', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

  // The mark is three pieces of type — number, `%`, `OFF` — and nothing else: no animation, no glyph
  // drawing, no player, and no asset to load.
  const tag = read('src/components/offer-tag.tsx');
  assert.ok(tag.includes(">%</Text>"), 'the mark writes a plain % character');
  // The file's own doc comment mentions the player that used to be here, so this looks for a real
  // import rather than for the word.
  assert.ok(!/from 'lottie|require\([^)]*lottie/.test(tag), 'the mark plays nothing');
  assert.ok(!/import .*react-native-svg/.test(tag), 'and draws nothing');
  assert.ok(tag.includes('tabularNums'), 'the percentage uses tabular figures so rows do not wobble');

  const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
  for (const name of ['lottie-react-native', 'lottie-web']) {
    assert.ok(!(name in pkg.dependencies), `${name} is not a dependency any more`);
  }
  assert.ok(
    !existsSync(fileURLToPath(new URL('../assets/lottie', import.meta.url))),
    'the animation asset is gone',
  );
  assert.ok(
    !existsSync(fileURLToPath(new URL('../scripts/generate-lottie-offer.mjs', import.meta.url))),
    'and so is its generator',
  );

  // The rail card's corner: the offer mark at the top left, 8px in, with nothing else on the artwork.
  const cards = read('src/components/course-cards.tsx');
  assert.ok(
    /cardOffer: \{ position: 'absolute', top: spacing\.sm, left: spacing\.sm \}/.test(cards),
    "the badge is pinned to the card artwork's top-left corner at the 8px baseline",
  );
  assert.ok(!/cardImageBadge/.test(cards), 'the level badge no longer shares that artwork');
  assert.ok(/<OfferBadge percent=\{offer\} size="md"/.test(cards), 'and the corner mark uses the larger pill');
  assert.ok(/<OfferBadge percent=\{offer\} mark="side"/.test(cards), "the row's price line uses the label-free mark");

  // The course hero shows the same mark, in the on-image colour, with no pill.
  const course = read('src/app/course/[id].tsx');
  assert.ok(/<OfferMark percent=\{offer\} color=\{colors\.textInverse\} \/>/.test(course), 'the course hero uses it too');
});

check('profile fields validate email', () => {
  assert.equal(validateEmail(''), null);
  assert.equal(validateEmail('deepak@example.com'), null);
  assert.ok(validateEmail('deepak@example'));
  assert.ok(validateEmail('deepak example.com'));
});

void formatIndianMobile;

for (const run of queue) await run();

process.stdout.write(`\n${checks} checks passed\n`);
