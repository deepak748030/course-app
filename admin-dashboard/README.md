# YDU Academy — Admin Dashboard

Full-control admin console for the platform, themed like the app: white surfaces,
hairline borders and the warm `#FFC629` yellow accent (DM Sans throughout).

**Stack:** React 18 · Vite · TypeScript · Tailwind CSS v4 · react-router · recharts ·
lucide icons.

## Features

- **Sign in** with email + password (JWT session, admin role enforced)
- **Dashboard** — revenue/enrollment/orders/new-learner KPI cards with period deltas,
  30-day revenue chart, 14-day enrollment chart, top courses, rating distribution donut,
  category breakdown, recent orders and sign-ups
- **Analytics** — server behaviour data: API requests + unique learners per day
  (7/30/90-day), DAU/WAU/MAU, purchase funnel (view → checkout → paid with conversion %),
  activity by hour, most-viewed and most-purchased courses, and what learners search for.
  Refreshes live on new orders/sign-ups
- **Courses** — search/filter, publish toggle, full editor drawer (pricing, flags,
  outcomes, equipment and the complete section/lesson curriculum), delete with cascade
- **Categories** — CRUD with icon picker and in-use protection
- **Learners** — search, block/unblock, promote to admin, spend + enrollment counts, delete
- **Orders** — status tabs, search, totals, mark paid/pending/refunded (access granted or
  revoked automatically)
- **Reviews** — moderation: hide/show (rating recomputes) and delete
- **Coupons** — percent/flat codes with usage caps, expiry and active toggle
- **Settings** — app name/tagline/support, maintenance mode, minimum app version

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to the backend (`http://localhost:5000` by default —
override with `VITE_PROXY_TARGET=… npm run dev`).

Seeded admin login: `admin@yduacademy.com / Admin@123`.

## Demo mode

If the server (or its database) is unreachable, the dashboard transparently switches to a
built-in demo dataset — a banner says so and offers a reset button. CRUD keeps working and
persists to `localStorage`, which makes the console demoable without any infrastructure.
Point it at a live server + MongoDB for real control.

## Build

```bash
npm run build      # outputs dist/ — host it behind anything that proxies /api to the server
```
