# باشگاه جنتلمن‌ها — Gentleman's Club

React 19 + Vite + TypeScript + Tailwind CSS v4. Persian (fa), RTL, fully responsive.

    npm install
    npm run dev      # development
    npm run build    # type-check + production build
    npm run typecheck
    npm test         # the unit tests of the admin panel (vitest)

Layers (back → front): background (z0) → title (z10) → man PNG (z20) → price list (z30) → header (z40).
Copy, prices and image paths: `src/data/content.ts`. Man cut-out: `public/images/man.png` (+ `.webp`).
To use a higher-res cut-out, replace both files (same aspect ratio) or update `manImage` in content.ts.

## Admin panel

`/admin` is a lazily loaded bundle of the same SPA (`src/admin/`). It never touches the public
pages: every style of the panel is prefixed with `ad-` and lives in `src/admin/admin.css`, and the
Tailwind scanner ignores the folder (`@source not "./admin";` in `src/index.css`) so the admin
classes never end up in the public CSS.

```
src/admin/
  AdminApp.tsx      the routes, the query cache, the session and the toasts
  api/              the typed client, the types and the React Query hooks
  auth/             the session in sessionStorage, the provider and the guard
  layout/           the shell, the sidebar (column on desktop, drawer on mobile) and the icons
  components/       the shared buttons, fields, modals, tables and states
  lib/              the formatting (Persian digits, Jalali dates) and the form rules
  pages/            the login, the dashboard, the bookings, the services and the settings
```

The data comes from the admin endpoints of the API (see [`../backend/README.md`](../backend/README.md)):
`POST /admin/login`, `GET /admin/stats/summary`, `GET|PATCH /admin/bookings`,
`POST /admin/bookings`, `GET|POST|PATCH|DELETE /admin/services`,
`POST|DELETE /admin/services/{id}/images`, `GET|PUT /admin/settings` and
`GET|POST|DELETE /admin/closed-dates`. The hour list of the manual booking form comes from the
public `GET /availability`.

## Backend

The API lives in [`../backend/`](../backend/README.md) (FastAPI + PostgreSQL). The frontend talks to
it through `src/lib/api.ts`.

| | |
| --- | --- |
| Dev proxy | `/api` → `API_PROXY_TARGET` (in compose: `http://api:8000`, resolved by Docker DNS) |
| Direct calls | set `VITE_API_URL` (e.g. `http://localhost:8080`) to bypass the proxy |
| Services | `GET /api/v1/services` — the service list with the image gallery (the static data is the fallback) |
| Media | `/api/v1/media/services/{filename}` — the uploaded service images (served by the API) |
| Availability | `GET /api/v1/availability` — the days and the free slots |
| Booking | `POST /api/v1/bookings` — the tracking code is shown on the confirmation screen |

The browser only ever calls the relative `/api` path, so the app and the API share one origin and
no CORS is needed.

### Configuration

The configuration lives in the `.env` of the **repository root** (next to `docker-compose.yml`),
because the vite dev server, the backend and docker compose share it. Vite is configured with
`envDir: '..'` so it picks that file up.

```
# empty → the relative path is used and the Vite dev proxy forwards /api
VITE_API_URL=
# target of the Vite dev proxy (server side only); empty means http://localhost:$API_PORT
API_PROXY_TARGET=
```

Start the backend first (`cd .. && docker compose up --build`), otherwise the frontend falls back to
the static data and shows a retry button on the booking page.

## Docker

The `frontend` service of `docker-compose.yml` runs the vite dev server inside the container and
publishes it on `http://localhost:8081`:

```bash
cd ..
docker compose up --build
```

The source folder is mounted into the container, so a change is picked up immediately; a named
volume keeps the image's Linux `node_modules` from being shadowed by the Windows one.
