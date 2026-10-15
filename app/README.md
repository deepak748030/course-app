# YDU Academy

A dairy-education app built with Expo (SDK 57), Expo Router and TypeScript. Dairy owners, plant
hands and family producers browse structured video courses — milk handling, paneer, ghee, curd,
cheese, frozen desserts, farm practice, selling — buy them, and learn inside an immersive lesson
player with a standardised batch sheet beside the video.

> **Server-connected build.** The catalog, accounts, purchases, lesson progress and reviews all
> live on the YDU Academy server (`../server`). The payment gateway is still a simulation — no money
> moves — but every paid order is a real record on the server. Lesson videos come only from the server; the app bundles no demo video.
> Anything not implemented is said so in the UI rather than shown as a working control.

## Run it

The app talks to the YDU Academy server in `../server`. Start that first (MongoDB required —
see `../server/.env.example`), then:

```bash
npm install                          # or: bun install
echo "EXPO_PUBLIC_API_URL=http://localhost:5000" > .env   # Android emulator works with localhost;
                                                           # physical devices need the machine's LAN IP
npx expo start                       # then press i / a / w, or scan with Expo Go
```

If the server is unreachable the app shows an honest offline state with retry — it never fakes data.
Learner accounts for local testing are created by `npm run seed` in the server
workspace (values defined there, not listed here).

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

## Authentication

Sign-in uses an **Indian mobile number (+91) and a one-time code**. The app calls
`POST /api/auth/otp/request` with the number, then `POST /api/auth/otp/verify` with the 6-digit
code. A number seen for the first time gets a learner account on the spot. The returned JWT is
stored with `expo-secure-store` on native devices (falls back to `AsyncStorage` on web).

Outside production the server accepts the demo code **`246810`** for any number, and it also
prints each generated code in the server console. The demo code can never sign in on a
production server (see `DEMO_OTP` in `server/.env.example`). The session drives everything account-bound: enrollments, progress,
orders, reviews and the private realtime channel.

## Payments (Razorpay)

Checkout uses **Razorpay**. The server prices the course (coupons included), creates a Razorpay
order, and the app opens Razorpay Checkout. The payment is confirmed on the server before the
course unlocks.

- **iOS / Android:** the native `react-native-razorpay` SDK (v3). It opens Razorpay's own sheet, not a
  WebView. It needs a **development build**, not Expo Go: `npx expo prebuild`, then
  `npx expo run:android` or `npx expo run:ios`.
- **Web:** Razorpay's `checkout.js`, which draws the same modal in the page. No WebView.
- Card, UPI and bank details are entered only in Razorpay's sheet. They never reach the app or the server.
- The app only holds the public key id (sent by the server with each order). The key secret stays on the server.

Outcomes: a successful payment unlocks the course. A failed payment shows the failure with a retry
button and nothing is charged. A payment the learner closes shows the cancelled note.

Coupons are validated by the server (`POST /api/coupons/validate`); the seeded codes are
`WELCOME10` (10% off), `DAIRY200` (₹200 off) and `FESTIVE25` (25% off).

## Analytics and recommendations

The app records anonymous behaviour events — app opens, course views, lesson starts/completions,
checkout starts, searches — through `src/services/analytics.ts`. Events queue in memory and flush
to the server in one batched POST every 15 seconds (or on backgrounding), fire-and-forget, so they
never block the UI. The server aggregates them into the admin dashboard's Analytics page and uses
co-purchase data to power the "Learners also took" rail on each course page.

## Speed

The catalog boots instantly from an on-device cache of the last good load; a background refetch
then sends `If-None-Match`, so an unchanged catalog returns a 304 with no body. Server responses
are gzip-compressed. Together these keep cold starts and catalog refreshes light on slow
connections.

## Project structure

```text
src/
  app/                     Expo Router routes (file = screen)
    index.tsx              entry gate: onboarding → sign-in → app
    onboarding.tsx         three-slide introduction
    auth/phone.tsx         +91 mobile number entry (Get OTP)
    auth/otp.tsx           six-digit code entry, verify, resend
    auth/interests.tsx     optional preference chips
    (tabs)/                Home · Explore · My learning · Profile
    course/[id].tsx        course details (trailer, outcomes, curriculum, reviews, sticky CTA)
    checkout/[id].tsx      demo checkout with scenarios and coupons
    purchase-success.tsx   confirmation → first lesson
    lesson/[courseId]/[lessonId].tsx   player: Overview · Sheet (batch sheet) · Notes
    saved.tsx · notifications.tsx · settings.tsx · help.tsx · legal.tsx · policies.tsx
  components/              UI kit (ui.tsx), course cards, animated icons, bottom sheet, brand marks
  constants/theme.ts       design tokens: colours, spacing, radii, type scale, motion (no shadows)
  data/content.ts          editorial content kept in-app: notifications, FAQs, legal docs
  lib/format.ts            pure formatters/validators (runnable outside the app)
  lib/util.ts              haptics feedback
  media.ts                 the only place that maps data keys → bundled assets
  services/                api.ts (HTTP), realtime.ts (socket.io), catalogService.ts (server→app
                           mapping + offline cache), catalog-context.tsx (live catalog + gate),
                           analytics.ts (batched behaviour events), auth.ts, payments.ts
  store.tsx                single context: session (server JWT), enrollments + progress hydrated
                           from the server and synced back, notes, saved, prefs
  types/index.ts           typed data models
```

State is one React context with `AsyncStorage` persistence — no state library for a project this size.

## Assets and placeholders

Only artwork the app actually shows is bundled: the brand files, the onboarding frames
(`onboarding-ydu-poster`, `onboarding-fresh-milk`, `onboarding-testing`, AI-generated for this prototype)
and the placeholder panel. Course covers come from the server. Unused stills and demo videos were removed.

A course without a cover (or whose cover fails to load) shows `brand-mark.png` centred on the ivory
brand ground, so nothing ever renders as a broken image. Replace any cover with real photography using the same file name; no code
changes are needed.

Derived media is reproducible and documented in scripts:

```bash
bash scripts/generate-brand-assets.sh # app icon, splash, favicon, Android adaptive layers
```

Lessons without an uploaded video show no player; the app never plays stand-in footage.

The brand mark is a **milk can with a play triangle on its face and a drop beneath it**, drawn as
vector geometry in `src/components/marks.tsx` (a 48-unit box: lid plate and neck, tapered shoulder,
straight can body, knocked-out play triangle, drop) and mirrored by
`scripts/generate-brand-assets.sh`, so the app icon, splash, favicon, Android adaptive layers and the
in-app mark all come from the same source of truth. The wordmark is the two weights of DM Sans —
"YDU" semibold, "Academy" regular.

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
- **The player is all picture.** The lesson screen paints nothing dark under the video: the transport
  floats on the picture itself over two short gradients — the transport row (speed, quality, sound,
  fullscreen), then the timeline with the start and end times owning the ends of the row — with
  play/pause and the skip buttons in the free band between them. Every size is derived from the measured surface height (16:9,
  so ~200pt on a phone), so the rows can never crowd each other and the dark area is exactly the video.
- **The transport waits for the lesson to start.** Before the first play the picture shows the short
  transport only — title, back and lesson list, skip and play, the timeline — and the transport row
  holds its band empty so nothing shifts when it arrives. They join as soon as the lesson plays, and
  from then on the whole overlay is a three-second peek: it shows on a tap on the picture or any
  transport action and hides again while the video is playing. A paused picture keeps its controls, so
  a learner who stops to read the frame is never left with a blank one.
- **The transport row says what it can honestly do.** Speed is a real rate change, sound is a real
  `player.muted` toggle, and quality names the rendition actually on screen — from the video tracks the
  platform reports, or shows "Auto" when it reports none. Opening it lists every
  rendition with its resolution, bitrate and which one is in use, and says plainly that the demo lessons
  ship a single 540p file each: no invented 480p/720p/1080p menu that changes nothing. (The bundled demo
  clips are video-only, so the sound toggle has no audio to reveal until a lesson with a track plays.)
- **The course page keeps the same 8pt gutter as every other screen.** Its title block, section
  headers, bullets, section notes, curriculum rows and review rows all sit on `layout.screen` (8) —
  only the inside of a card pads 16 — so the page no longer reads as if it were inset one step
  further than Home or My learning. The facts strip (lessons · duration · language · level) is a
  full-bleed tone band: negative 8pt margins cancel the gutter so the band reaches both screen
  edges, while its contents stay on the 8pt gutter and line up with everything else.
- **The discount lives on the picture, where the player puts its own controls.** The course hero
  carries `33% off` at the bottom right — an animated percent glyph and a white label straight on
  the scrim, exactly like the player's Fullscreen control at its bottom right — instead of a yellow
  badge pasted into the text block. The yellow animated offer badge still marks offer prices on
  cards, the home hero and checkout.
- **The rating is the one thing beside the title.** On a course page the overline and the title are
  one unit (2px apart), and the empty column to their right carries the rating: a 36px star that
  leans left and right every couple of seconds with five fine star motes drifting down past it, the
  value in the title size next to it and the review count muted underneath. Under reduced motion it is
  a still star with no motes. The old separate `4.9 (876)` line is gone — the rating is stated once.
- **A "see more" action points where it goes.** `SectionHeader` takes an optional trailing glyph, and
  Home's *See all* and *Explore* actions use the arrow in the theme accent beside their label (4px
  between them), so the row reads as a way out of the screen rather than three words. The prop is
  opt-in: *Clear* and *Clear filters* stay plain, because nothing is being navigated to.
- **Every price wears the theme accent.** The payable price on a course card, a course row and the
  price line, plus the checkout's *Total payable*, are all `accentText` — amber on white+yellow, deep
  green on white+green — the same colour as the sticky bars. The struck-through list price stays
  muted grey on cards and red on the two bars where it sits next to the amount you pay.
- **A discount is never written with a “%” character.** The offer mark reads `33` · the animated
  percent mark · `OFF`: the number in the theme accent and one step bolder, the animation exactly where
  the “%” used to sit, then `OFF` in caps. `OfferMark` in
  `src/components/offer-tag.tsx` renders it for the yellow pill badge (course artwork, home banner, the
  buy bar) and the course page's hero mark renders the same three parts in the on-image white.
  The colour is the theme accent — deep amber on white+yellow, deep green on white+green — and the pill
  ground stays brand yellow so the ink-and-amber animation keeps its contrast in both themes.
  A “%” character survives only where a percentage is prose rather than a mark: progress like
  `40% complete`, the checkout's `Course discount (25% off)` line and the coupon chips.
- **The home banner is a carousel that pages itself.** The top banner is now a full-bleed horizontal
  `ScrollView` holding the featured courses — the ranked popular pick first, then the next two, each
  carrying its own artwork, offer badge and copy. It advances every 4.5 seconds and wraps from the last
  slide back to the first, so the strip keeps moving without an end; a hand-swipe pauses the timer and
  the snap position decides which page dot is filled. Native uses `pagingEnabled`, web augments it with
  `scroll-snap-align` on every slide, and the timer's page jump is a `scrollTo`. Under reduced motion,
  or with a single featured course, the timer never starts and the first banner simply sits there.
- **Every save icon celebrates the tap.** `src/components/save-button.tsx` replaces the four bookmark
  `IconButton`s (course card, course row, course hero, lesson batch sheet, saved list) and animates on
  the tap itself — save or remove — rather than on the state change, so a tap always answers:
  the glyph pops up past its size and settles back below it, eight accent motes spray out of the icon —
  four to each side, tilted above and below the horizontal, out to ~40px — with a ring opening behind
  them, and the button gives the usual press feedback. Reducing the motion drops the motes and the spring entirely; the clamped animated values
  mean a burst that has not started can never draw an inverted one. Motes park outside the button box,
  so a parent that clips (a card edge) will clip them — the cards, the hero and the sheet do not.
- **Money wears two colours.** The amount you pay uses the theme accent (amber on white+yellow, deep
  green on white+green) and the price it replaced is struck through in red — `#B42318`, 6.3:1 on
  white, because the amber this design language uses for decoration cannot clear 4.5:1 at 12px. Both
  the course page's bar and the checkout bar read the same way, and the checkout bar carries the list
  price too, so the saving is visible where the Pay button is.
- **Checkout reads as one order.** The course and its price lines are a single card — artwork, facts,
  then `Course price / Course discount (33% off) / Total payable` under a hairline — instead of a
  summary row followed by a separate boxed price card. The coupon offers the demo codes as tappable
  chips next to the field, "what you get" is a gold-check list on the 8pt gutter, the three demo
  outcomes are hairline radio rows in one card, and the failure, cancellation and already-purchased
  notices are full-bleed strips directly above the pay bar. A course that is already owned turns the pay
  bar into "You own this course / Start learning" instead of a dead disabled button.
- **The lesson screen keeps the app gutter under the picture.** Section and status share the first
  line — the status is a badge with its own glyph — and the title, the facts and the course progress
  follow on a 4 / 8 / 12 rhythm instead of four evenly-spaced lines. The tabs' body stays on the 8pt
  gutter, and the lesson's neighbours (the next lesson, the whole curriculum) are one hairline list
  with icon tiles rather than three stacked text links.
- **Hairlines over boxes.** Data lists draw a divider between rows (none after the last) instead of
  spacing every row apart, and dividers inset to the row content when a row has a leading icon.
- **Concentric radii** (4 / 8 / 12 / 16, pill only for single-line content) and 44pt minimum touch
  targets with 48px controls.
- **Motion is restrained**: press feedback under 100ms, entrances 160–320ms, and every animation checks
  reduced-motion first.
- **Profile is the one door to money, policies and help.** The profile screen's last group is
  `Settings & policies` and carries, in order: Settings, *Transactions*, *Refund policy*,
  *Privacy policy*, *Terms and conditions*, *All policies* and *Help and support*. Transactions (`/transactions`)
  lists every order on the account newest-first — cover, title, date, the coupon that was applied,
  a `Saved ₹…` badge and the amount — over a summary of what was paid in total, fetched from the
  server (`GET /api/orders/my`), with the honest line that payments are simulated. A new purchase
  or a refund changes it immediately, and the empty state offers the catalog.
  The legal screen (`/legal?doc=…`) serves one document per screen — Terms, Privacy, Delete account,
  Refunds, About, Contact and Disclaimer — and the policies hub (`/policies`) lists them all with
  Profile and the sign-in screen linking to it, so every page opens without an account. The contact
  document doubles as the place to reach someone: it adds tappable Email us / Call us rows from the
  server's support details, and the delete-account document leads a signed-in learner to Settings.
  `{{supportEmail}}` / `{{supportPhone}}` in the copy are filled in from the server settings. The
  same documents are published as sign-in-free HTML by the server under `/legal`, which is where
  the Google Play listing's privacy policy and delete-account URLs point.
- **Settings is only what Settings is for.** Settings now holds notifications, the device data
  controls (reset demo data, log out) and account deletion (`DELETE /api/users/me` — Google Play
  wants the mechanism inside the app), and nothing else: the old Account block with profile details,
  the Payments block with the payment-security row and the Policies block are gone, because the
  account details live on Profile and every policy has one home there. No screen lost a destination —
  each row moved, it was not deleted.
- **A course is a flat list of lessons.** Sections were removed: `Course.lessons[]` is the whole curriculum,
  with no `sectionId`. `catalogService.mapCourse` maps it straight to `Course.lessons`, the course page
  and the player's “All lessons in this course” sheet render one numbered list, and the header reads
  `N lessons · total time`. Courses saved with the old section shape are flattened on server boot
  (`flattenLegacySections` in `server/src/models/Course.js`). `scripts/selfcheck.ts` covers the flat mapping.
- **Two themes, switchable from Profile.** `src/constants/theme.ts` holds two palettes — white + yellow
  (the default, and the original look, unchanged) and white + deep green — and `THEMES` is the picker's
  list. Both are white-surface: only the accent, the tinted block and the text tones differ, so layout,
  type and the 8px rhythm are identical in both. The switch lives on **Profile → Appearance** as a radio
  pair, each option showing a live miniature of the theme it picks. Two mechanisms carry the change to
  every screen without touching component code: `colors` is a live proxy over the active palette (so
  inline props and default parameter values resolve per render), and style sheets are declared as
  `createStyles(() => StyleSheet.create({ ... }))` instead of being built once at module load, so
  `styles.card` re-resolves for the picked theme. Changing the theme remounts the tree under the
  navigation theme (`key` in `src/app/_layout.tsx`) — a fresh mount is what re-resolves every style, and
  it is also why the switch does not depend on the React Compiler's memoisation, which cannot see a
  palette read through a module-level proxy. The choice is written with the rest of the local state
  (`state.theme`) and survives a restart; it is kept across sign-out, because it belongs to the device
  and not to the account. One deliberate exception: **the offer mark keeps the brand yellow ground in
  both themes**, because the mark's ink would vanish on the deep green accent.
- **The offer mark is text, not an animation.** `src/components/offer-tag.tsx` draws the discount as
  three pieces of type — the number, a `%`, and `OFF` — inside a brand-yellow pill: `25 % OFF`. Earlier
  builds played a Lottie composition here; that was more machinery than a discount needs, and it is
  gone (no Lottie runtime, no animation asset, nothing to fail at runtime). The pill keeps the gaps
  tight (2px) because every pixel in it is inside one small mark, and the mark appears wherever the
  price decision happens: on course artwork, in list rows, above the course title, in the sticky buy
  bar and on the checkout total.
- **Animated icons** (`src/components/animated-icons.tsx`): the glyphs that carry meaning are animated —
  the notification bell swings and rests, the offer sparkle pops, the check marks and course facts pulse,
  the cart hops. Each one is a lucide glyph inside a Reanimated wrapper driven by one looping shared
  value on the UI thread; there is **no CSS animation and no animation asset**, and every loop freezes
  into a static icon under reduced motion. `Button` also accepts `sheen` for a slow light sweep across a
  primary fill (used by Buy now and Pay), held under reduced motion.
- **Offers are derived, never typed twice**: a course seed may carry `listPriceInr`, and
  `discountPercent()` computes the percentage from the two prices, so a price change can never
  disagree with the badge that advertises it.

A UI reference board of 100 course-app screens was used for this redesign; it is not part of the
repository.

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
  Home carries the brand tile and the catalog size, Explore asks "What will you make today?", Learning
  shows progress with a Saved shortcut, Profile is the identity block (avatar, name, member since) with a
  Settings action. Stacked screens keep the centred 56px `AppBar` with a back button — which now only
  renders when the router can actually go back.
- **Search**: the Home header carries a search icon (no search bar in the screen body) that opens Explore,
  where one pill component on the warm surface tone with a hairline border does the typing. Focusing it
  reveals **recent searches** (last five, stored through the crash-proof storage wrapper) and
  **"Try searching"** suggestions that are pre-filtered against the catalog, so a suggestion can never
  return nothing; zero results offer the same chips as a recovery path.

## What is intentionally not included

- **No offline downloads, captions, casting or picture-in-picture**, so the player shows no controls for them.
- **No push notifications.** The bell shows clearly-labelled sample notifications; the delivery service is not wired up.
- **No support inbox.** Help offers shareable feedback instead of a contact form that pretends to send.
- **No dark theme.** Both themes are light-first (white surfaces); the only dark area in the app is
  the video itself.
- **Policy copy needs a final legal review.** The seven documents (Terms, Privacy, Delete account,
  Refunds, About, Contact, Disclaimer) describe what the app and server actually do and follow Google
  Play's requirements, but they still need the business's own details (legal entity, address,
  Grievance Officer) and a lawyer's review — edit them from the admin's Content page, or edit
  `src/data/content.ts` and run `node scripts/export-content.mjs` to update the server's copy.

Demo data lives on the device: logging out clears the learning data stored for the session, while
onboarding completion and app preferences are kept.

## Verification performed

- `npx tsc --noEmit` (also run with `--noUnusedLocals`) — clean.
- `bun scripts/selfcheck.ts` (`npm run check`) — 19 checks: phone normalisation/validation/masking,
  quantity scaling, INR/clock/duration formatting, the greeting helper, the server→app catalog
  mapping (ids, offer math, curriculum grouping), the search/filter/sort helpers that act on any
  catalog, the profile field validators (email), and a source scan that fails the
  build if any Reanimated animation callback or animated-style body touches React state (see "Native
  worklet safety"). All pass.
- Metro bundled the app for **iOS, Android and web** with no resolution errors, and every route
  returned HTTP 200 from the dev server.
- The exported web bundle is executed inside a JSDOM DOM (`/tmp/domtest/run3.mjs`, `run4.mjs`, `tabs.mjs`
  with `SEED=1`) so the real client boot path runs and can be inspected: every route renders real content
  (no empty screens), and click-throughs were exercised for the tab bar (all four tabs, via
  `role="tab"`), Home → course details → checkout, My learning → lesson player → Overview/Sheet/Notes,
  the sort/filter sheets opening and closing, and focusing the search field (recent searches +
  suggestions panel). Zero console or unhandled errors. This is a DOM check, not a visual one.
- The offer mark, the profile/settings split and the standalone-lesson path were read back from the
  exported web bundle in JSDOM (`/tmp/domtest/offer-probe.mjs`, `probe.mjs`, `lesson-sheet-probe.mjs`):
  Home renders 29 marks all reading `33OFF` / `25OFF` / `30OFF` / `32OFF` / `35OFF` with `hasPercentChar=false`,
  the number and `OFF` resolving to `rgb(138, 98, 0)` on white+yellow and `rgb(20, 83, 45)` on
  white+green, each with its glyph and the `33 percent off` a11y label intact; the course hero mark is
  the same three parts in white on the scrim, and the checkout pill reads `25OFF`. Profile's last group
  lists Settings, Transactions, Refund policy, Privacy policy, Terms and conditions, Help and support;
  Settings renders only the notifications block and the device-data block — no Account, Payments or
  Policies text left in it; `/legal?doc=refund` serves the refund document behind a Terms · Privacy ·
  Refunds switcher; `/transactions` with the seed alone reads `Paid in this prototype ₹0 · 1 course
  unlocked on this device · 1 transaction · Milk Foundations · Sample account · Included`, and with a
  seeded demo purchase reads `₹2,699 paid · 2 courses unlocked · ₹1,300 saved against list prices` and a
  row carrying `14 Feb 2026 · YDU10 applied`, `Demo purchase`, `Saved ₹1,300`, `₹2,699` and the struck
  `₹3,999`. The curriculum is a single flat list of lessons (sections were removed). This is a DOM
  check, not a visual one.
- The home carousel and the save burst were read back from the exported web bundle in JSDOM
  (`/tmp/domtest/mote-probe.mjs`, `snap-check.mjs`, `saves-probe.mjs` at 390x844): the banner reports
  *Featured courses, 3 banners*, three 390px slides with the milk-foundations, paneer-craft and
  artisan-cheese artwork, `scrollSnapAlign=start` under a `scroll-snap-type: x mandatory` scroller, and
  the page dots went `18/6/6 → 6/18/6 → 6/6/18` at 5.2 s and 10.4 s before wrapping back to `18/6/6`
  with `scrollLeft` 0 at 15.6 s. Tapping a save control renders eight round/sliver motes plus a 44px
  ring — `rgb(138, 98, 0)` in the yellow theme, `rgb(20, 83, 45)` in the green one — and on the course
  hero the glyph trail read `0.92 → 1.31 → 1.22 → 0.95` while the ring opened `0.40 → 0.70 → 1.23 →
  1.60` and the outer motes flew out ±24px, which is the pop and the left/right burst the tap is
  supposed to produce. Same probe on the lesson route: the sheet tab's control flips the saved count to
  0 and bursts. This is a DOM check, not a visual one.
- Status bar. Android has two modes and both are covered, because the black bar came from the second
  one while the first fix (a strip painted in-app) only covered the first:
  1. edge-to-edge (Android 15+): the bar is transparent, so it shows what is painted behind it —
     `expo-system-ui` sets the decor view to the app background and `src/components/app-status-bar.tsx`
     paints a white strip across the safe-area inset as a second layer;
  2. not edge-to-edge (Android 14 and older, and Expo Go without platform enforcement): the bar is an
     opaque system bar whose default colour is black. `app.json`'s `androidStatusBar` lives in the host
     manifest, so Expo Go ignores it, and React Native *ignores* `StatusBar.setBackgroundColor`
     entirely on an edge-to-edge activity. The app therefore calls `StatusBar.setBackgroundColor` (and
     `setTranslucent(false)`) at startup, on every status-bar tone change and on every foreground, with
     the app background for light screens and the player surface for dark ones.
  3. No screen asks for the dark tone any more. The player and the course hero used to, which is what
     painted the bar with the player surface — the black bar in the report. They now keep the app
     background: the strip above the video is white with dark icons, and the video starts below it.
- Player geometry and the control peek, in the same DOM harness at a 390pt viewport: the transport is
  pinned to the picture's edges (top row 58pt, transport 65pt with the speed/fullscreen band reserved,
  play button 64pt in the free band between them), the timeline row holds `0:00 · track · 0:00` with the
  track taking the remaining width, and no element outside the video surface is painted in the player
  colour, in both themes. The peek was walked through the state machine by firing the media events the
  player listens to: before the first play the transport stays up for as long as you look at it and the
  the transport row is absent; on play it appears; three seconds later the overlay is gone
  and the tap layer is all that is left; a tap brings the whole transport back; three seconds later it
  is gone again; a pause brings it back and it stays. The four transport buttons were dumped together:
  two groups of two, `speed · 540p` on the left and `Mute · Fullscreen` on the right, and the quality
  sheet reports "540p · 960 x 540 · in use" with the single-rendition note.
- Home was probed in both themes: *See all* and *Explore* each carry exactly one glyph in the accent
  (`#8A6200` amber / `#14532D` green) 4px from a label in the same colour, and all twelve payable
  prices on the screen resolve to that accent while only the two struck list prices stay muted.
- The course page's gutters were re-checked after the change: intro padding left/right 8 with a 4px
  gap, section titles and bullets at 8, the facts band at `margin -8 / padding 8` so it bleeds edge
  to edge with its content still on the gutter, the hero control at `right: 8px; bottom: 16px` with
  the label "33 percent off this course", and the "What you'll need" section gone (the page now runs
  What you'll learn → Curriculum → Reviews).
- The course page's head was dumped at a 390pt viewport: intro padding 12/16 with a 4px gap, the
  kicker and title 2px apart in their column, the rating block 8px away on the right holding one big
  star and five motes (one star and no motes with reduced motion on) and reading
  `Rated 4.9 out of 5 from 876 reviews`, and the sticky bar showing ₹2,999 in the theme accent with
  ₹3,999 struck in red — amber on the yellow theme, `rgb(20, 83, 45)` on the green one.
- The checkout screen was walked in both states: the order card with its hairlines and 8pt rows
  (course price, 33% off, total), the coupon field with its two demo-code chips, the gold-check list,
  the three outcome rows with their radios, and the pay bar reading "₹1,199 · 33% off · Total payable ·
  one-time · Pay ₹1,199" when the course is not owned, or "You own this course" with "Start learning"
  when it is.
- The dairy switch was walked in the exported web build the same way: the home screen reads
  "YDU Academy · 8 courses · 8 tracks", the hero and the "Browse by / Track or skill" rails carry the
  dairy tracks, Explore opens with "What will you make today?", and the seeded demo enrolment is
  `milk-foundations` ("The reception check, step by step", 0%). The lesson route
  `/lesson/milk-foundations/milk-foundations-l1` renders the player with the tabs
  Overview · **Sheet** · Notes, and the control peek still behaves: transport up and no extras before
  the first play, four extras (speed, 540p, Mute, Fullscreen) on play, hidden three seconds later,
  back on a tap, hidden again, and staying put while paused. The course page shows the rating block
  ("Rated 4.8 out of 5 from 1,284 reviews") and the checkout shows ₹1,999 in the theme accent with
  ₹2,999 struck through in red. `scripts/selfcheck.ts` now also asserts that every course belongs to a
  dairy track and that no cooking-course wording is left in the catalog.
- The brand mark was rendered at 512px and at 96px to check it survives icon size, and the app icon,
  splash, favicon and Android adaptive layers were regenerated from the same geometry. Onboarding,
  auth and the tabs all still boot with zero import errors.
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
