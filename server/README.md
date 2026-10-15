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

The server publishes the app's policy documents as plain, sign-in-free HTML — this is
the URL to paste into the Play Console's privacy policy field:

- `GET /legal` — hub listing all six documents
- `GET /legal/:doc` — one document: `privacy`, `terms`, `refund`, `about`, `contact`, `disclaimer`

They render the admin's copy from Settings (Content page in the dashboard) when saved, and the
built-in text otherwise, so the app and the web listing always show the same documents. No login,
no database required.

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
- **SMS delivery:** no provider is wired up yet. `src/services/sms.js` is the single place to add
  one. Until then, development prints the code to the server console, and production returns
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
| `GET` | `/legal/:doc` | one policy page: `privacy` · `terms` · `refund` · `about` · `contact` · `disclaimer` |
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

## Image uploads

`POST /api/uploads` (multipart, field `file`, ≤ 8 MB, images only) stores through
**Cloudinary** when `CLOUDINARY_URL` (or `CLOUDINARY_CLOUD_NAME` + key + secret) is
set — the returned URL is the CDN delivery URL. Without Cloudinary the server falls
back to local storage in `server/uploads`, served from `GET /uploads/*`, so the flow
works in plain development too. `GET /api/uploads/policy` reports which backend is live.

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
├── services/uploads.js  # Cloudinary (preferred) or local-disk image storage
├── seed/seed.js         # deterministic dev seed
└── utils/               # HttpError, asyncHandler, token signing
```

## Course videos on Backblaze B2 (private bucket, free tier)

Lesson videos are uploaded from the admin dashboard (Courses → lesson → **Upload video**). The
admin dashboard sends the file to this server, which streams it into the bucket. The bucket stays **private**: when a learner opens
a lesson, the app asks the server for a short-lived link. The server gives that link only to
enrolled learners (or for free-preview lessons). Free tier: 10 GB storage.

### Step 1: Backblaze B2 console

1. **Buckets → Create a Bucket.** Name it, for example `ydu-course-videos`. Bucket Type: **Private**.
2. Open the bucket. On the details page, copy the **Endpoint**, for example
   `s3.us-west-004.backblazeb2.com`.
3. No CORS setup is needed. The admin dashboard sends videos to this server, which uploads them to the bucket.
3. **App Keys → Add a New Application Key**:
   - Name: `ydu-server`
   - Allow access to Bucket(s): only `ydu-course-videos`
   - Type of access: Read and Write
   - Capabilities: `listFiles`, `readFiles`, `writeFiles`
   - Click create. Copy the **keyID** and the **applicationKey** now. The key is shown only once.

### Step 2: Where each value goes

| Value | Where you get it | Where you put it |
| --- | --- | --- |
| `B2_S3_ENDPOINT` | Bucket details → Endpoint, add `https://` | `server/.env` |
| `B2_KEY_ID` | App Keys → keyID of the new key | `server/.env` |
| `B2_APPLICATION_KEY` | App Keys → applicationKey (copied once) | `server/.env` |
| `B2_BUCKET` | The bucket name you created | `server/.env` |

Example `server/.env` lines (these are placeholders, use your own values):

```
B2_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_KEY_ID=<your keyID>
B2_APPLICATION_KEY=<your applicationKey>
B2_BUCKET=ydu-course-videos
```

- `server/.env` is git-ignored. Never commit it, and never paste these values in chat or in GitHub.
- The **app** (`app/.env`) and the **admin dashboard** need no Backblaze values. The app only needs
  `EXPO_PUBLIC_API_URL`, and the dashboard only talks to the server.
- Restart the server after editing `.env`. Check `GET /api/admin/uploads/video/status` in the
  admin session. It returns `"configured": true` when all four values are set.

Videos up to 4 GB each. Replacing or removing a video in the dashboard does not delete the old file
from the bucket.
