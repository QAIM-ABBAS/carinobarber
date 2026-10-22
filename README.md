# باشگاه جنتلمن‌ها — Gentleman's Club

Website of the barbershop «باشگاه جنتلمن‌ها»: a Persian (fa), RTL single page application with a
FastAPI backend.

```
.
├── frontend/          # React 19 + Vite + TypeScript + Tailwind CSS v4
├── backend/           # FastAPI + SQLAlchemy 2.0 + PostgreSQL 16 + Alembic
├── docker-compose.yml # db + api + frontend
└── .env.example       # the configuration of the whole stack
```

## Quick start

```bash
cp .env.example .env
# change SECRET_KEY and ADMIN_PASSWORD in .env
docker compose up --build
```

Three containers, one network:

| Service | Image | Reachable at | Published on the host |
| --- | --- | --- | --- |
| `db` | postgres:16-alpine | `db:5432` | `127.0.0.1:5433` (host only) |
| `api` | `./backend` | `api:8000` | `127.0.0.1:8080` (host only) |
| `frontend` | `./frontend` (vite dev server) | `frontend:5173` | **`0.0.0.0:8081`** |

- The browser only talks to the frontend: `http://localhost:8081`
- The frontend server proxies `/api` to `http://api:8000` over the compose network, so the app
  and the API share one origin (no CORS, the cookies would work too)
- The api container runs `alembic upgrade head` and seeds the default data on the first start
- The database and the API are bound to the loopback interface — they are **not** reachable from
  outside the machine

Your own reverse proxy (nginx) sits in front of the frontend:

```nginx
location / {
    proxy_pass http://127.0.0.1:8081;
}
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
```

```bash
docker compose logs -f api     # follow the logs
docker compose down            # stop everything
docker compose down -v         # stop and delete the database volume
```

If a host port is reserved by Windows (Hyper-V/WinNAT excludes ranges like 7981-8080 on some
machines), copy `docker-compose.override.example.yml` to `docker-compose.override.yml` and move the
mapping there.

## Development

```bash
# backend (the database from docker, the API from the virtualenv)
cd backend
python -m venv .venv && .venv/Scripts/activate      # Windows
pip install -r requirements-dev.txt
docker compose up -d db                             # from the repository root
alembic upgrade head
uvicorn app.main:app --reload --port 8080

# frontend (the vite dev server proxies /api to the API)
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

Details: [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md)

## پنل مدیریت (Admin panel)

The barbershop has its own admin panel: **`/admin`** (e.g. `http://localhost:8081/admin`).
It is a separate, lazily loaded bundle of the same SPA — the public pages are not affected by it.

| Page | Path | What it does |
| --- | --- | --- |
| ورود | `/admin/login` | Username + password (five attempts per minute and per IP) |
| داشبورد | `/admin` | Today's bookings, the upcoming bookings and the revenue of the month |
| نوبت‌ها | `/admin/bookings` | The booking list with the filters, the status changes and the manual bookings |
| خدمات | `/admin/services` | The service catalog: prices, durations, the order and the active state |
| تنظیمات | `/admin/settings` | The working hours, the closing weekdays, the limits and the holidays |

**Login** with the account of the `.env` file of the repository root:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-now
```

**Changing the password:** edit `ADMIN_PASSWORD` in `.env` and restart the api
(`docker compose up -d api` or restart uvicorn). The password is hashed with bcrypt on the first
request of the process — there is no separate user table and no password reset page.

The session lives in `sessionStorage` (it ends when the tab is closed) and the admin routes send
`<meta name="robots" content="noindex">`. If a reverse proxy (nginx or Caddy) sits in front of the
frontend, add the header as well:

```
# nginx
location /admin { add_header X-Robots-Tag "noindex, nofollow"; ... }
# Caddy
header /admin* X-Robots-Tag "noindex, nofollow"
```

## Configuration

`.env` in the repository root configures the whole stack (docker compose, the backend and the vite
dev server). `backend/.env` may override single values for a local run — it wins over the root
file.

| Variable | Used by | Description |
| --- | --- | --- |
| `FRONTEND_PORT` | compose | Host port of the frontend (`8081` by default) |
| `API_PORT` | compose | Host port of the API (`8080` by default, host only) |
| `API_PROXY_TARGET` | vite | Target of the dev proxy — in compose it is `http://api:8000` |
| `VITE_API_URL` | vite | Base URL of the API — empty means "same origin" |
| `APP_ENV` | backend | `production` enables the strict secret validation |
| `DATABASE_URL` | backend | SQLAlchemy URL (`db:5432` in compose, `localhost:5433` from the host) |
| `SECRET_KEY` | backend | JWT signing key — at least 32 characters in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | Lifetime of the admin token |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | backend | The admin account (hashed with bcrypt) |
| `CORS_ORIGINS` | backend | Comma separated list of allowed origins |
| `SHOP_TIMEZONE` | backend | Timezone of the shop (`Asia/Tehran`) |
| `SEED_ON_START` | backend | Seed the services and the shop settings on startup |
| `SMS_PROVIDER` | backend | SMS implementation (`console` is the only one available) |
| `RATE_LIMIT_BOOKINGS_PER_MINUTE` | backend | Booking attempts per minute and per IP |

## Tests

```bash
cd backend  && pytest -q && ruff check .    # 178 tests
cd frontend && npm run typecheck && npm test && npm run build
```
