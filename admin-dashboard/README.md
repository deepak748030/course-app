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
  outcomes, equipment and the complete lesson curriculum), delete with cascade
- **Categories** — CRUD with icon picker and in-use protection
- **Learners** — search, block/unblock, promote to admin, spend + enrollment counts, delete
- **Orders** — status tabs, search, totals, mark paid/pending/refunded (access granted or
  revoked automatically)
- **Reviews** — moderation: hide/show (rating recomputes) and delete
- **Coupons** — percent/flat codes with usage caps, expiry and active toggle
- **Settings** — app name/tagline/support, maintenance mode, minimum app version

## Run it

```bash
cp .env.example .env   # set VITE_API_URL to your backend server's URL
npm install
npm run dev        # http://localhost:5173
```

There is no proxy: the browser sends every API request (and the realtime socket)
straight to the server named by `VITE_API_URL` in `.env`
(`http://localhost:5000` by default). Point it at a deployed backend, e.g.
`VITE_API_URL=https://api.example.com`, and restart the dev server — the
dashboard itself can be hosted anywhere. The server must allow this origin via
its `CORS_ORIGIN` setting (defaults to `*`).

Seeded admin login: `admin@yduacademy.com / Admin@123`.

## Build

```bash
npm run build      # outputs dist/ — host it on any static host; VITE_API_URL is
                   # baked in at build time, so set it in .env before building
```

## Deploy on Vercel

The repo already carries [`vercel.json`](vercel.json) in this folder — do not
delete it. It contains the SPA rewrite (`/(.*)` → `/index.html`) that a
react-router app needs: without it, refreshing or directly opening any
non-root page (`/courses`, `/orders`, …) returns Vercel's `404: NOT_FOUND`,
because those paths are client-side routes, not files in `dist/`.

In the Vercel project:

- **Root Directory:** `admin-dashboard` (so a repo-root import builds this app,
  not the repo root, which has no `package.json`).
- **Framework Preset:** Vite — build `npm run build`, output `dist`
  (already pinned in `vercel.json`, so it works even on defaults).
- **Environment variable:** `VITE_API_URL` = the deployed backend's base URL
  (e.g. `https://api.example.com`, no trailing `/api`). It's baked in at build
  time, so set/change it → trigger a fresh deploy. Also allow this dashboard's
  origin in the server's `CORS_ORIGIN`.
