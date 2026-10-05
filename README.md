# Rasoi Studio

A premium Indian cooking-education app built with Expo (SDK 57), Expo Router and TypeScript.
Learners browse structured video courses, buy them, and learn inside an immersive lesson player.

> **Prototype build.** The catalog, prices, ratings and reviews are fictional sample
> content. Authentication and payments are demo implementations; nothing is charged and no SMS is
> sent. Anything not implemented is said so in the UI rather than shown as a working control.

## Run it

```bash
npm install          # or: bun install
npx expo start       # then press i / a / w, or scan with Expo Go
```

Handy scripts:

```bash
npm run check        # tsc --noEmit + the runnable self-check (scripts/selfcheck.ts)
npm run typecheck    # TypeScript only
npx expo start --web # web build
```

Expo Go can run most of the app. Screens that depend on native modules added by this project
(`expo-video`, `expo-secure-store`, `expo-haptics`) need a development build:

```bash
npx expo run:android   # or: npx expo run:ios, or: eas build --profile development
```

## Demo authentication

There is no SMS provider. `src/services/auth.ts` ships a demo adapter, and both auth screens say so.

- **Demo code: `246810`** (6 digits). Documented here only — it is never shown in the app and never logged.
- After **3 wrong attempts** the flow returns an “expired” state so that error path is reproducible.
- `9000000000` is reserved to simulate a request that cannot reach the server.
- Resend countdown starts at 30 seconds and is a UX affordance only; real rate limiting belongs on the server.
- The session token is stored with `expo-secure-store` on native devices. On **web** there is no secure
  store, so it falls back to `AsyncStorage` — acceptable for a demo, not for production.

To go live, implement `AuthService` against your provider and swap the export at the bottom of the file.
Nothing else in the app changes.

## Demo payments

There is no payment gateway. `src/services/payments.ts` never touches the network, never collects card,
UPI or bank details, and never claims a real settlement.

Checkout lets you pick which scenario the demo reproduces:

| Scenario | Result |
| --- | --- |
| Successful payment | Enrols you and unlocks every lesson of the course |
| Failed payment | Shows the failure + retry state (nothing is charged) |
| Cancelled by user | Returns to checkout with an explanatory note |

Demo coupons: `RASOI10` (10% off) and `FOUNDATIONS20` (20% off). Every coupon is applied to a
simulated total only.

## Project structure

```text
src/
  app/                     Expo Router routes (file = screen)
    index.tsx              entry gate: onboarding → sign-in → app
    onboarding.tsx         three-slide introduction
    auth/phone.tsx         +91 mobile number entry
    auth/otp.tsx           six-digit code, resend timer, error states
    auth/interests.tsx     optional preference chips
    (tabs)/                Home · Explore · My learning · Profile
    course/[id].tsx        course details (trailer, outcomes, curriculum, reviews, sticky CTA)
    checkout/[id].tsx      demo checkout with scenarios and coupons
    purchase-success.tsx   confirmation → first lesson
    lesson/[courseId]/[lessonId].tsx   player: Overview · Recipe · Notes
    saved.tsx · notifications.tsx · settings.tsx · help.tsx · legal.tsx
  components/              UI kit (ui.tsx), course cards, bottom sheet, brand marks
  constants/theme.ts       design tokens: colours, spacing, radii, type scale, motion (no shadows)
  data/                    catalog.ts (courses, categories, recipes), content.ts (FAQ, coupons, legal)
  lib/format.ts            pure formatters/validators (runnable outside the app)
  lib/util.ts              haptics feedback
  media.ts                 the only place that maps data keys → bundled assets
  services/                auth.ts, payments.ts (swappable boundaries)
  store.tsx                single context: session, enrollments, progress, notes, saved, prefs
  types/index.ts           typed data models
```

State is one React context with `AsyncStorage` persistence — no state library for a project this size.

## Assets and placeholders

Photography in `assets/images` was **AI-generated for this prototype** using the art direction in the
project brief (warm editorial culinary style). Photography is used for illustration only; every course
cover corresponds to fictional sample content.

Generated so far: three onboarding plates, the home hero and six course covers. Two covers
(`course-eggless-desserts.jpg`, `course-knife-skills.jpg`) and any other missing photograph fall back to
`placeholder-panel-4x3.jpg` — a deliberately branded warm panel so nothing ever renders as a broken image. Replace them with real photography using the
same file names; no code changes are needed.

Derived media is reproducible and documented in scripts:

```bash
bash scripts/generate-media.sh        # demo lesson clips (ffmpeg) + placeholder panels
bash scripts/generate-brand-assets.sh # app icon, splash, favicon, Android adaptive layers
```

`assets/videos/demo-clip-*.mp4` are short, silent demo clips (a slow push-in over a still) used as
placeholder lesson and trailer footage until real course video exists. They are real, playable files —
no invented streaming URLs are used anywhere.

The brand mark (bowl + steam + play triangle) is vector geometry in `src/components/marks.tsx` and is
mirrored by the icon generator, so the app icon and the in-app mark stay in sync.

## Design system

The UI follows the project's design rules document and is generated from one token file
(`src/constants/theme.ts`):

- **One font family.** DM Sans, bundled locally in two weights — 400 regular and 600 semibold.
- **Five type sizes** on a 1.25 ratio (29 / 23 / 19 / 15 / 12) with line-height tightening as size grows
  and no third-party serif. Prices and counters use tabular figures.
- **No shadows anywhere.** Elevation is expressed with surface tone plus 1px alpha hairlines; the tab bar
  and sticky footers separate with a border, never an elevation.
- **8px baseline.** Screen side padding is 8, gap between items is 8, cards and forms pad 16, sections
  breathe 24. Banners and the player are full-bleed with a 0 side gap.
- **Hairlines over boxes.** Data lists draw a divider between rows (none after the last) instead of
  spacing every row apart, and dividers inset to the row content when a row has a leading icon.
- **Concentric radii** (4 / 8 / 12 / 16, pill only for single-line content) and 44pt minimum touch
  targets with 48px controls.
- **Motion is restrained**: press feedback under 100ms, entrances 160–320ms, and every animation checks
  reduced-motion first.

A UI reference board of 100 course-app screens used for this redesign is kept in `image-search/`.

### Tabs, headers and search

- **Tab bar** (`src/components/tab-bar.tsx`): four destinations, 56px + bottom safe area, hairline top
  border, no shadow. The active tab is a **filled** icon in the accent colour on a soft yellow pill that
  **slides between tabs on a spring**, with the outline icon cross-fading out and the label switching to
  semibold — matching the tab bar rules (`filled icon + primary colour + semibold label`). Labels stay one
  word ("My learning" is only the spoken label), the bar hides while the keyboard is open, and every tap
  fires light haptics on device. Icons come from `@expo/vector-icons` (Ionicons) because the rules need a
  filled *and* outline pair for the same glyph.
- **Headers**: a tab is already labelled in the bar, so no tab screen repeats its own name as a page
  title. `TabHeader` composes 16px padding, an optional leading mark and one overline + one semibold line:
  Home carries the brand tile and the catalog size, Explore asks "What will you cook today?", Learning
  shows progress with a Saved shortcut, Profile is the identity block (avatar, name, member since) with a
  Settings action. Stacked screens keep the centred 56px `AppBar` with a back button — which now only
  renders when the router can actually go back.
- **Search**: one pill component on the warm surface tone with a hairline border (`SearchField` for typing,
  `SearchEntry` for the Home shortcut). Focusing it reveals **recent searches** (last five, stored through
  the crash-proof storage wrapper) and **"Try searching"** suggestions that are pre-filtered against the
  catalog, so a suggestion can never return nothing; zero results offer the same chips as a recovery path.

## What is intentionally not included

- **No offline downloads, captions, casting or picture-in-picture**, so the player shows no controls for them.
- **No push notifications.** The bell shows clearly-labelled sample notifications; the delivery service is not wired up.
- **No support inbox.** Help offers shareable feedback instead of a contact form that pretends to send.
- **No dark theme.** The brand identity is light-first with one immersive dark player surface.
- **No legal documents.** Terms and Privacy are marked placeholder copy that must be replaced before shipping.

Demo data lives on the device: logging out clears the learning data stored for the session, while
onboarding completion and app preferences are kept.

## Verification performed

- `npx tsc --noEmit` (also run with `--noUnusedLocals`) — clean.
- `bun scripts/selfcheck.ts` (`npm run check`) — 10 checks: phone normalisation/validation/masking,
  quantity scaling, INR/clock/duration formatting, the greeting helper, catalog derivation (unique
  lesson ids, counts, section integrity, preview lessons), the search/filter/sort behaviour of the
  Explore screen, and a source scan that fails the build if any Reanimated animation callback or
  animated-style body touches React state (see "Native worklet safety"). All pass.
- Metro bundled the app for **iOS, Android and web** with no resolution errors, and every route
  returned HTTP 200 from the dev server.
- The exported web bundle is executed inside a JSDOM DOM (`/tmp/domtest/run3.mjs`, `run4.mjs`, `tabs.mjs`
  with `SEED=1`) so the real client boot path runs and can be inspected: every route renders real content
  (no empty screens), and click-throughs were exercised for the tab bar (all four tabs, via
  `role="tab"`), Home → course details → checkout, My learning → lesson player → Overview/Recipe/Notes,
  the sort/filter sheets opening and closing, and focusing the search field (recent searches +
  suggestions panel). Zero console or unhandled errors. This is a DOM check, not a visual one.
- Status bar (Android edge-to-edge makes it transparent, so it shows whatever is painted behind it):
  1. `backgroundColor: "#FFFFFF"` at the top level of app.json is the root view / window background,
     and `androidStatusBar` sets `dark-content` icons on the same white;
  2. `expo-system-ui` sets the decor view background before React mounts and again on every foreground;
  3. `src/components/app-status-bar.tsx` paints a white strip across the safe area itself, so a host that
     ignores the window colour still cannot show a black band;
  4. the lesson player and the course hero declare `<AppStatusBar style="light" />`, which switches the
     strip off over their dark surfaces and uses light icons. All other screens get dark icons on the
     app background.
- Not performed: device/emulator runs, EAS builds, and pixel-level visual review (no browser or
  simulator in this environment) — layouts and gestures have not been verified on hardware.

## Native worklet safety

Reanimated compiles the arguments of `withTiming` / `withSpring` / `withRepeat` / `withDecay` /
`withSequence` for the UI runtime. Passing a completion callback there produces a worklet, so calling
a React setter from it throws on device:

```
[Worklets] Tried to synchronously call a Remote Function. Called "bound dispatchSetState" on the UI Runtime
```

The bottom sheet did exactly that to unmount itself after the exit animation (`withTiming(1, …,
(finished) => setMounted(false))`), and because the sheet is mounted — closed — by Explore, the course
screen, the lesson player, Profile and Settings, the red screen appeared on almost every tap. The
unmount is now scheduled from the JS thread with a timer that matches the animation duration, and
`bun scripts/selfcheck.ts` scans `src/` for any regression of this pattern — animation callbacks and
`useAnimatedStyle` / `useDerivedValue` / `useAnimatedReaction` bodies that call a React setter
(`runOnJS` / `scheduleOnRN` wrapped callbacks are accepted) — and reports the exact file and line. Web silently degrades these callbacks to JS, so a green web run is
not evidence — the source scan is the guard.

## Boot resilience

Two failures could previously leave the app on a blank first screen, and both are now fixed at the
source:

- **Fonts were a hard gate.** The root layout rendered nothing until `useFonts` resolved. If a font
  request stalled, every screen stayed blank and no tap did anything. The app now renders
  immediately and the bundled DM Sans faces swap in when they arrive.
- **Storage was a hard gate.** Hydration awaited `AsyncStorage`, which on web reads
  `window.localStorage` — a call that throws inside a cross-origin iframe when the browser blocks
  third-party storage. A rejected hydrate left `ready` false forever. All storage now goes through
  `src/lib/storage.ts`, which is timeout-bounded, never rejects and falls back to memory, and the
  boot gate releases even when storage is unavailable.
- A root `ErrorBoundary` shows a readable card with a retry action instead of a blank page or a
  red box if a screen ever throws, and the plugin splash screen is released at most 1.6s after
  launch regardless of what is still loading.
