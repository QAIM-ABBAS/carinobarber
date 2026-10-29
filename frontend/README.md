# Carino Barber

React 19 + Vite + TypeScript + Tailwind CSS v4. Persian (fa), RTL, fully responsive.

    npm install
    npm run dev      # development
    npm run build    # type-check + production build
    npm run typecheck
    npm test         # the unit tests, public and admin (vitest)

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
`POST /admin/login`, `POST /admin/session`, `GET /admin/stats/summary`, `GET|PATCH /admin/bookings`,
`POST /admin/bookings`, `GET|POST|PATCH|DELETE /admin/services`,
`POST|DELETE /admin/services/{id}/images`, `GET|PUT /admin/settings` and
`GET|POST|DELETE /admin/closed-dates`. The hour list of the manual booking form comes from the
public `GET /availability`.

When the logged-in customer's phone is `ADMIN_PHONE`, the public navbar shows «پنل مدیریت». The
item links to `/admin/sso`, a small page outside `RequireAuth` that exchanges the customer token
for an admin token (`POST /admin/session`) and redirects to `/admin`. Opening `/admin` directly
still shows the normal username/password login.

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
| Booking | `POST /api/v1/bookings` — the tracking code is shown on the confirmation screen; it **requires a customer token** and carries no phone (`src/lib/api.ts`) |
| Account | `POST /api/v1/auth/otp/request` + `/auth/otp/verify`, `GET/PATCH /api/v1/me`, `/api/v1/me/bookings` (the customer endpoints of the «حساب») |

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

## حساب کاربری (Customer account)

The public app has a customer account (no passwords — phone + one-time code):

- `src/auth/` — the session: `storage.ts` keeps the customer JWT + user in `localStorage`
  (`gc_customer`, expiry aware), `AuthProvider` exposes `useAuth()` everywhere in the public
  app and lets the API client attach `Authorization: Bearer …` (a 401 ends the session).
- `src/components/OtpVerify.tsx` — the shared code step (dev box, resend countdown, Persian
  digit input with auto-submit, the exact server error texts). `OtpDevBox` next to it is the
  only consumer of the dev-mode `dev_code` — remove both together with `OTP_DEV_MODE`.
- `src/account/` + `src/pages/AccountPage.tsx` — the `/account` route: the login card and the
  logged-in profile, bookings tabs and the cancel dialog (styles in `src/account.css`,
  `.ac-` prefix).
- `src/pages/BookingPage.tsx` + `src/components/BookingVerifyCard.tsx` — the booking flow
  verifies the phone before creating a booking; on `slot_taken` it recovers to step 3 without
  a second code.
- `src/pages/AboutPage.tsx` — the `/about` route («درباره ما»): the story, the four reasons to
  choose the shop and the booking call to action (styles in `src/about.css`, `.ab-` prefix).
  The copy lives in `aboutPage` in `src/data/content.ts`; the footer links to it.

The exact steps to enable a real SMS provider later are documented in the root `README.md`
(«حساب کاربری» → *Going live with real SMS later*).

## Docker

The `frontend` service of `docker-compose.yml` runs the vite dev server inside the container and
publishes it on `http://localhost:8081`:

```bash
cd ..
docker compose up --build
```

The source folder is mounted into the container, so a change is picked up immediately; a named
volume keeps the image's Linux `node_modules` from being shadowed by the Windows one.
