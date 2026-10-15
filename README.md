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
| [`admin-dashboard/`](admin-dashboard/) | Full-control admin console: courses, categories, learners, orders, reviews, coupons, content & policies, settings — with live charts. | `cd admin-dashboard && npm install && npm run dev` |

## How the pieces talk

```
app/ ──────────────► server/ ◄────────────── admin-dashboard/
  REST + socket.io      (Express + Mongoose,      REST (/api, VITE_API_URL)
  (catalog, auth,        MongoDB, JWT auth,       + socket.io live feed
   orders, progress,      socket.io realtime,      (orders, signups,
   reviews)               Cloudinary uploads)       reviews, catalog)
```

- The **server** exposes a public/app API under `/api` (catalog, auth, enrollments,
  orders, reviews, coupons, settings, uploads) and an admin API under `/api/admin`
  guarded by JWT + `role: admin`. It also runs a socket.io realtime layer: catalog and
  settings changes broadcast to everyone, and activity (orders, signups, reviews) is
  pushed live to connected admins.
- The **app** is fully server-driven: the catalog, accounts (+91 mobile number + OTP), purchases,
  lesson progress and reviews all live on the server — there is no bundled catalog. Set
  `EXPO_PUBLIC_API_URL` in `app/.env` to point at the server (Android emulators can use
  `http://localhost:5000`). Lesson videos stay bundled as demo media.
- The **admin dashboard** signs in with the admin account the seed creates (values in
  `server/src/seed/seed.js`) and controls everything the app shows, with a live activity
  feed.
- **Google Play policy pages**: the server publishes the app's documents as plain,
  sign-in-free HTML at `/legal` (`privacy`, `delete-account`, `terms`, `refund`, `about`,
  `contact`, `disclaimer`) — paste `https://<your-api-host>/legal/privacy` into the Play
  Console's privacy policy field and `https://<your-api-host>/legal/delete-account` into
  Data safety → Delete account URL. The dashboard's **Content** page edits the copy (FAQ,
  all seven documents, checkout terms) and lists these links ready to copy. See
  [server/README.md](server/README.md#google-play-checklist) for the Play Console checklist.
- Images (course covers in the dashboard, learner avatars in the app) upload through
  `POST /api/uploads`: Cloudinary when `CLOUDINARY_URL` is configured, with a local
  disk fallback served from `/uploads`.

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

# 3. In another terminal (the app):
cd app
echo "EXPO_PUBLIC_API_URL=http://localhost:5000" > .env   # or the LAN IP for devices
bun install
bun run start               # Expo dev server → press w for web, a for Android
```

Each workspace has its own README with the full details.
