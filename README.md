# YDU Academy

A course platform for the dairy trade, organised as three independent workspaces:

```
course-app/
├── app/               # Mobile app — Expo / React Native (Expo Router)
├── server/            # Backend API — Node.js, Express, Mongoose (MongoDB), JWT
└── admin-dashboard/   # Admin console — React + Vite + Tailwind (white + yellow theme)
```

| Workspace | What it is | Run it |
| --- | --- | --- |
| [`app/`](app/) | The learner-facing mobile app (catalog, checkout, lessons, reviews). | `cd app && bun install && bun run start` |
| [`server/`](server/) | REST API the app and the admin dashboard share. | `cd server && npm install && npm run seed && npm run dev` |
| [`admin-dashboard/`](admin-dashboard/) | Full-control admin console: courses, categories, learners, orders, reviews, coupons, settings — with live charts. | `cd admin-dashboard && npm install && npm run dev` |

## How the pieces talk

```
app/ ──────────────► server/ ◄────────────── admin-dashboard/
  (public catalog,      (Express + Mongoose,      (proxies /api to the
   auth, checkout,       MongoDB, JWT auth)        server in dev)
   reviews)
```

- The **server** exposes a public/app API under `/api` (catalog, auth, orders, reviews,
  coupons, settings) and an admin API under `/api/admin` guarded by JWT + `role: admin`.
- The **admin dashboard** signs in with an admin account (`admin@yduacademy.com /
  Admin@123` after seeding) and controls everything the app shows. When the server or its
  database is unreachable, the dashboard switches to a clearly-labelled built-in demo
  dataset so it stays usable.
- The **app** currently ships with local prototype data; its service boundaries
  (`app/src/services/`) are the intended wiring points for this API.

## Quickstart

```bash
# 1. MongoDB running locally, then:
cd server
cp .env.example .env        # set MONGODB_URI + a random JWT_SECRET
npm install
npm run seed                # sample catalog, users, orders + admin account
npm run dev                 # API on http://localhost:5000

# 2. In another terminal:
cd admin-dashboard
npm install
npm run dev                 # http://localhost:5173 → sign in as admin
```

Each workspace has its own README with the full details.
