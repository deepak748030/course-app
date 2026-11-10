# YDU Academy — Server

REST API for the YDU Academy course app and its admin dashboard.

**Stack:** Node.js · Express · Mongoose (MongoDB) · JWT auth · bcrypt · zod validation.

## Setup

```bash
npm install
cp .env.example .env   # then edit values
npm run seed           # wipes + reseeds sample data (dev only!)
npm run dev            # node --watch, http://localhost:5000
```

Environment variables (see `.env.example`):

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port (the dashboard proxies `/api` here) |
| `MONGODB_URI` | — | MongoDB connection string |
| `JWT_SECRET` | dev fallback | Token signing secret (required in production) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGIN` | `*` | Comma-separated origins, or `*` |

The server starts HTTP immediately and connects to MongoDB in the background with
retries; while the database is down, every data route answers a clean `503` and
`GET /api/health` reports the state. The public policy pages under `/legal` keep
working too — they fall back to the built-in copy.

## Public policy pages (Google Play)

The server publishes the app's policy documents as plain, sign-in-free HTML — these are
the URLs the Play Console asks for:

- `GET /legal` — hub listing every document
- `GET /legal/privacy` — the privacy policy (Play Console → App content → Privacy policy)
- `GET /legal/delete-account` — how to delete an account with or without the app, and what is
  deleted or kept (Play Console → App content → Data safety → Delete account URL)
- `GET /legal/:doc` — the rest: `terms`, `refund`, `about`, `contact`, `disclaimer`

They render the admin's copy from Settings (Content page in the dashboard) when saved, and the
built-in text otherwise, so the app and the web listing always show the same documents. No login,
no database required. Long documents open with an "On this page" index, and every clause has a
stable anchor (for example `/legal/privacy#deleting-your-account`).

`{{supportEmail}}`, `{{supportPhone}}` and `{{appName}}` in the copy are filled in from Settings —
as tap-to-email / tap-to-call links on the web. The academy's details are the defaults
(`yduacademy@gmail.com`, `+91 7489301982` — `DEFAULT_SUPPORT_EMAIL` / `DEFAULT_SUPPORT_PHONE` in
`src/models/Settings.js`), and the dashboard's **Settings** page can change them. A database seeded by
an earlier build still holding the old demo values (`support@ydu.academy`, `+91 98765 43210`) is
switched to the real ones automatically when the server connects; values an admin typed are never
touched.

The built-in text lives in `app/src/data/content.ts`. After editing it, run
`node scripts/export-content.mjs` from `app/` to regenerate `src/data/defaultContent.js` here and
the dashboard's fallback copy; the script refuses copy the dashboard could not save.

### Google Play checklist

1. Deploy the API behind **HTTPS** and open `https://<api-host>/legal/privacy` and
   `https://<api-host>/legal/delete-account` in a private browser window — both must load
   without signing in.
2. Check the contact details on both pages: support email `yduacademy@gmail.com`, phone
   `+91 7489301982`, Grievance Officer Deepak Kushwah, address YDU Academy, Khandwa, Madhya
   Pradesh, India (dashboard: **Settings** for the email and phone, **Content** for the rest). The
   business choices in the built-in copy — the 7-day / 25% change-of-mind refund window, deletion
   requests completed within 7 days — can be changed on the **Content** page too. Have a lawyer
   review the final text.
3. Play Console → **App content** → Privacy policy: the `/legal/privacy` URL.
4. Play Console → **App content** → Data safety, consistent with the privacy policy:

| Data type (Play) | Collected | Why | Notes |
| --- | --- | --- | --- |
| Personal info → Name, Phone number, User IDs | Yes (phone required) | Account management, app functionality | Phone signs in with OTP |
| Personal info → Email address | Optional | Account management | Only if the learner adds one |
| Photos | Optional | App functionality (profile photo) | Only the photo the learner picks |
| Financial info → Purchase history | Yes | App functionality (course access, refunds) | Orders |
| Financial info → User payment info | Only in `sdk` checkout mode | Purchases | Collected by the Razorpay SDK inside the app; `web` mode pays on Razorpay's page |
| App activity → App interactions, In-app search history | Yes | Analytics | First-party only; ~13-month retention |
| App activity → Other user-generated content | Optional | App functionality | Ratings and reviews |
| Device or other IDs | Yes | App functionality (push notifications) | Expo push token |

   Data shared with third parties: **none** (Razorpay, Expo/FCM, hosting and SMS act as
   service providers). Encrypted in transit: **yes** (HTTPS). Users can request deletion: **yes** —
   in the app (Settings → Delete account) and at the `/legal/delete-account` URL.
5. Account deletion (`DELETE /api/users/me`, and the admin's user delete) removes the profile and
   profile photo, orders, course access and progress, reviews, push tokens, the user's inbox
   messages and any live OTP, and de-links analytics events — exactly what `/legal/delete-account`
   promises. Keep the two in step if either changes.

## Seeded logins

`npm run seed` creates the accounts the demo runs with — a dashboard admin, learners
with sample orders, and the fixed OTP the app accepts outside production. The actual
values live in `src/seed/seed.js` (and `DEMO_OTP` in `.env`), so they are not
repeated here. Each seeded learner has a unique +91 mobile number (10 digits starting
6–9).

## Payments (Razorpay)

- `POST /api/payments/razorpay/order` `{ courseId, couponCode? }` prices the course on the server,
  creates a Razorpay order and returns the checkout config (public key id, order id, amount in paise).
- `POST /api/payments/razorpay/verify` `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
  checks the HMAC signature, confirms with Razorpay that the payment is `captured` and that the
  amount matches, then unlocks the course. Calling it again is safe.
- `POST /api/payments/razorpay/webhook` handles `payment.captured` as a backup, so a course still
  unlocks if the app closes before verify. It is checked against `RAZORPAY_WEBHOOK_SECRET`.
- `POST /api/orders` no longer creates paid orders. A learner can only get a paid order through Razorpay.
- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env`. Without the keys
  the payment routes answer `503 Payments are not configured`.

## Phone sign-in (OTP)

- `POST /api/auth/otp/request` `{ phone }` sends a six-digit code. The phone may be typed as
  `+91 98765 43210`, `919876543210` or `09876543210`. The code is valid for 5 minutes, the app may
  ask for a new one after 30 seconds, and `429` is returned when it asks sooner.
- `POST /api/auth/otp/verify` `{ phone, code }` returns `{ token, user }`. Three wrong codes
  expire the current code (`410`). A wrong code returns `401`.
- Codes are stored as an HMAC (never in plain text) and deleted once used.
- **SMS delivery:** `src/services/sms.js` sends the code through NinzaSMS
  (`POST https://ninzasms.in.net/auth/send_sms.php`, `rout: "sms"`). Set `NINZA_SMS_API_KEY` and
  `NINZA_SMS_SENDER_ID` in `.env` (optional `NINZA_SMS_ROUTE`: `sms` or `waninza` for WhatsApp OTP)
  and the same code path serves development and production; the API key is used in the
  server-side `Authorization` header and never reaches the app or the browser. Provider errors
  (invalid key, low balance, rate limit, …) become `502`/`429` responses with a readable message.
  Without the keys, development prints the code to the server console, and production returns
  `503` rather than logging a code.
- `DEMO_OTP` (default `246810`) is accepted for any number outside `NODE_ENV=production`.
- After changing the user model, re-run `npm run seed`: the phone and email indexes are now
  partial (empty values are allowed), so an older database may still carry the stricter ones.

The seed mirrors the app catalog (8 dairy courses) and generates ~60 days of users,
orders, enrollments and reviews so the dashboard charts have data.

## API overview

### App / public

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | liveness + db state |
| `GET` | `/legal` | public policy hub (plain HTML, no login) |
| `GET` | `/legal/:doc` | one policy page: `privacy` · `delete-account` · `terms` · `refund` · `about` · `contact` · `disclaimer` |
| `GET` | `/api/categories` | catalog categories |
| `GET` | `/api/courses` | published courses (`category`, `level`, `q`, `popular`, `beginner`) |
| `GET` | `/api/courses/:idOrSlug` | course detail |
| `GET` | `/api/courses/:idOrSlug/related` | recommendation rail — co-purchase first, then same track |
| `GET` | `/api/settings` | app settings (maintenance mode, support, …) |
| `POST` | `/api/auth/otp/request` | send a one-time code to a +91 mobile |
| `POST` | `/api/auth/otp/verify` | mobile + code → JWT (creates the learner on first sign-in) |
| `POST` | `/api/auth/register` | create email + password account |
| `POST` | `/api/auth/login` | email + password → JWT (admin dashboard) |
| `GET` | `/api/auth/me` | current user |
| `POST` | `/api/payments/razorpay/order` | start a Razorpay checkout for a course |
| `POST` | `/api/payments/razorpay/verify` | confirm a Razorpay payment and unlock the course |
| `POST` | `/api/payments/razorpay/webhook` | Razorpay webhook (signed, raw body) |
| `GET` | `/api/orders/my` | learner's transactions |
| `POST` | `/api/coupons/validate` | check a code + discounted price |
| `GET/POST` | `/api/courses/:courseId/reviews` | list / write a review (enrolled only) |
| `GET` | `/api/enrollments/my` | owned courses + lesson progress in one call |
| `DELETE` | `/api/users/me` | delete the signed-in account + its data (in-app, Play requirement) |
| `PATCH` | `/api/enrollments/:courseId/progress` | push completed lessons + resume position |
| `GET` | `/api/uploads/policy` | which storage backend answers uploads |
| `POST` | `/api/uploads` | multipart image upload (field `file`), admins → covers, learners → avatars |
| `POST` | `/api/analytics/events` | batched behaviour events from the app (≤50 per call, anonymous allowed) |

### Admin (JWT + `role: admin`, all under `/api/admin`)

| Area | Routes |
| --- | --- |
| Stats | `GET /stats/overview` — KPIs with deltas, revenue & enrollment series, top courses, rating distribution, category breakdown, recent activity |
| Analytics | `GET /analytics/overview?days=30` — requests/uniques per day, DAU/WAU/MAU, funnel, peak hours, most viewed/purchased, top searches |
| Courses | `GET/POST /courses`, `GET/PUT/DELETE /courses/:id`, `PATCH /courses/:id/publish` |
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Users | `GET /users`, `GET/PATCH/DELETE /users/:id` (block, role, cascade delete) |
| Orders | `GET /orders`, `PATCH /orders/:id` (status changes grant/revoke access) |
| Reviews | `GET /reviews`, `PATCH /reviews/:id` (hide), `DELETE /reviews/:id` |
| Coupons | `GET/POST /coupons`, `PUT/DELETE /coupons/:id` |
| Settings | `GET/PUT /settings` |

All bodies are validated with zod; errors come back as `{ error, details? }` with the
right status code (400 validation, 401/403 auth, 404 not found, 409 conflict, 429 rate
limit, 503 database down).

## Realtime (socket.io)

socket.io serves on the same HTTP server (`/socket.io`). The handshake accepts an
optional Bearer token; sockets join `app` (everyone), `user:<id>` (their own devices)
and `admins` (role: admin). Events pushed today:

| Room | Event | When |
| --- | --- | --- |
| `app` | `catalog.changed` | a course/category is created, edited, published or deleted |
| `app` | `settings.updated` | app settings change |
| `user:<id>` | `enrollment.granted` | an order is marked paid or access is granted |
| `admins` | `order.created`, `user.registered`, `review.created`, `catalog.changed`, `settings.updated` | live dashboard feed |

## Image & video uploads (local server `uploads/` folder)

All uploaded media — course covers, home banners, learner profile photos, and lesson videos — is
stored directly on the server inside `uploads/` (defaults to `server/uploads`, or set `UPLOAD_DIR`
in `server/.env` to a persistent disk path in production).

- **Images** (`POST /api/uploads`, multipart field `file`, ≤ 8 MB): validated by MIME type and file
  magic bytes, saved under `uploads/<folder>/`, and returned as a relative `/uploads/...` path so
  changing the server domain or port never breaks stored images. Served from `GET /uploads/*`.
- **Course videos** (`POST /api/admin/uploads/video`, multipart field `file`, ≤ 4 GB): staged in
  `uploads/.tmp` and moved to `uploads/videos/courses/<courseId>/...`. Direct requests to
  `/uploads/videos/*` are blocked (`403`); enrolled learners (or free-preview lessons) obtain a
  signed playback link pointing to `GET /api/videos/stream?key=...&exp=...&sig=...` with full
  HTTP Range (`206 Partial Content`) seeking support. When lessons or courses are updated/deleted,
  unreferenced video files are cleaned up automatically.

## Analytics & recommendations

Every `/api` request is counted in memory and flushed to a per-day rollup
(`DailyStat`) every 30 seconds — that is where "requests per day/week/month"
comes from, at the cost of ~1 write per minute instead of one per hit.

Behaviour events (`app_opened`, `course_viewed`, `lesson_started`,
`checkout_started`, `search`…) arrive from the app in small batches via
`POST /api/analytics/events`. Two events are **server-emitted so they cannot
be faked**: `signup` (in register) and `order_paid` (when an order is paid).
Events TTL out after ~13 months; monthly history stays available through the
rollups, orders and users collections.

Recommendations (`/api/courses/:idOrSlug/related`) rank by co-purchase from
enrollments and fall back to the best of the same track — no external
ML service needed.

Responses are gzip-compressed (`compression`), and the app refetches the
catalog with `If-None-Match`, so an unchanged catalog costs a 304 with no body.

## Project layout

```
src/
├── index.js             # bootstrap: cors, json, routes, static /uploads, error handlers
├── config/              # env + mongoose connection (retry-aware)
├── models/              # User, Category, Course, Review, Order, Enrollment, Coupon, Settings
├── middleware/          # auth (JWT), zod validate, dbGuard, rate limit, error handler
├── controllers/         # app-facing + admin/ handlers
├── routes/              # route tables with zod schemas
├── realtime/socket.js   # socket.io rooms + typed emitters
├── services/uploads.js  # local server image storage (`uploads/`)
├── services/videoStorage.js # local server video storage (`uploads/videos/`) & signed Range streaming
├── seed/seed.js         # deterministic dev seed
└── utils/               # HttpError, asyncHandler, token signing
```

## Video storage environment options

No external bucket credentials are required. You can optionally set:

- `UPLOAD_DIR` in `server/.env` (defaults to `server/uploads`; in production point it to a mounted
  persistent disk so uploaded images and videos survive redeploys).
- `MAX_VIDEO_BYTES` in `server/.env` (defaults to `4294967296`, 4 GB per video).

Check `GET /api/admin/uploads/video/status` in an admin session to verify the active limits and
supported formats (`"configured": true, "storage": "local"`).
