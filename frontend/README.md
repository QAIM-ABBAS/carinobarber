# باشگاه جنتلمن‌ها — Gentleman's Club

React 19 + Vite + TypeScript + Tailwind CSS v4. Persian (fa), RTL, fully responsive.

    npm install
    npm run dev      # development
    npm run build    # type-check + production build
    npm run typecheck

Layers (back → front): background (z0) → title (z10) → man PNG (z20) → price list (z30) → header (z40).
Copy, prices and image paths: `src/data/content.ts`. Man cut-out: `public/images/man.png` (+ `.webp`).
To use a higher-res cut-out, replace both files (same aspect ratio) or update `manImage` in content.ts.

## Backend

The API lives in [`../backend/`](../backend/README.md) (FastAPI + PostgreSQL). The frontend talks to
it through `src/lib/api.ts`.

| | |
| --- | --- |
| Dev proxy | `/api` → `http://localhost:$API_PORT` (override with `API_PROXY_TARGET`) |
| Direct calls | set `VITE_API_URL` (e.g. `http://localhost:8080`) to bypass the proxy |
| Services | `GET /api/v1/services` — the service list (the static data is the fallback) |
| Availability | `GET /api/v1/availability` — the days and the free slots |
| Booking | `POST /api/v1/bookings` — the tracking code is shown on the confirmation screen |

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

`Dockerfile` builds the app and serves it with nginx, which also forwards `/api` to the backend —
so the browser and the API share one origin and no CORS is needed:

```bash
cd ..
docker compose up --build      # the frontend on http://localhost:8081
```
