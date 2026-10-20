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

## Quick start with Docker

```bash
cp .env.example .env
# change SECRET_KEY and ADMIN_PASSWORD in .env
docker compose up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| Frontend (nginx) | <http://localhost:8081> | serves the app and proxies `/api` to the backend |
| API | <http://localhost:8080> | `/docs` shows the OpenAPI UI |
| PostgreSQL | `localhost:5433` | published so the API can also run outside docker |

The ports come from `API_PORT` and `FRONTEND_PORT` in `.env` (port 8000 is reserved by Windows on
some machines). The container entry point applies the migrations and seeds the default data.

```bash
docker compose logs -f api     # follow the logs
docker compose down            # stop everything
docker compose down -v         # stop and delete the database volume
```

## Development

```bash
# backend (the database from docker, the API from the virtualenv)
cd backend
python -m venv .venv && .venv/Scripts/activate      # Windows
pip install -r requirements-dev.txt
docker compose up -d db                             # from the repository root
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# frontend
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

The vite dev server forwards `/api` to the API (see `API_PROXY_TARGET` / `API_PORT` in `.env`).
Details: [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md)

## Configuration

`.env` in the repository root configures the whole stack (docker compose, the backend and the vite
dev server). `backend/.env` may override single values for a local run — it wins over the root
file.

| Variable | Used by | Description |
| --- | --- | --- |
| `API_PORT` | compose, vite | Host port of the API (`8000` by default) |
| `FRONTEND_PORT` | compose | Host port of the nginx frontend (`8081` by default) |
| `VITE_API_URL` | vite | Base URL of the API — empty means "same origin" |
| `API_PROXY_TARGET` | vite | Target of the dev proxy — empty means `http://localhost:$API_PORT` |
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
cd backend  && pytest -q && ruff check .    # 148 tests
cd frontend && npm run typecheck && npm run build
```
