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
`GET /api/health` reports the state.

## Seeded logins

| Role | Sign in with | Credential |
| --- | --- | --- |
| Admin (dashboard) | email `admin@yduacademy.com` | password `Admin@123` |
| Learner (dashboard/API) | email `learner@ydu.academy` | password `Learner@123` |
| Learner (app) | mobile `+91 98765 00001` | OTP `246810` (demo) |
| Learner (app, phone only) | mobile `+91 98765 00002` | OTP `246810` (demo) |

Any other valid Indian mobile number also works in the app with OTP `246810`, outside
production. Each seeded learner has a unique +91 mobile number (10 digits starting 6–9).

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
| `POST` | `/api/orders` | checkout (creates enrollment when paid) |
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
