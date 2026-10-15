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
- **Content** — help FAQ, checkout lines and six documents: terms, privacy, refund & cancellation,
  shipping & delivery, account deletion and about (with `{{placeholders}}` for business details)
- **Play Store** — every public link to paste into Play Console / Razorpay, a checklist of missing
  business details, suggested Data safety and App content answers, and a draft store listing
- **Deletion requests** — requests from the public *Delete account* page (with the matching account,
  call/WhatsApp shortcuts and one-step deletion) plus the record of in-app deletions; live badge
- **Settings** — app name/tagline/support, business & legal details (address, GSTIN, Grievance
  Officer, courts, website), maintenance mode, minimum app version

## Public website (no sign-in)

The same deployment serves the pages Google Play, Razorpay and learners open without an account:

| Path | Page |
| --- | --- |
| `/privacy-policy` | Privacy Policy |
| `/terms` | Terms and Conditions |
| `/refund-policy` | Refund and Cancellation Policy |
| `/shipping-policy` | Shipping and Delivery Policy (digital courses) |
| `/delete-account` | Account deletion — request form (Play's "Delete account URL") |
| `/about` | About us |
| `/contact` | Contact, business details and Grievance Officer |
| `/pricing` | Published courses with prices |
| `/legal` | All of the above |

They read `GET /api/settings` (the admin's own text, or the built-in documents, with Settings →
Business details filled in), always use the green look, and fall back to the bundled text when the
server is slow to wake. Point a custom domain (e.g. `www.yourdomain.com`) at this Vercel project if
you prefer the policies not to live on the admin's address. Admin pages load on demand, so these
pages stay light.

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
