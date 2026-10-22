# باشگاه جنتلمن‌ها — Backend

FastAPI backend for the "Gentleman's Club" barbershop website (باشگاه جنتلمن‌ها).

| | |
| --- | --- |
| API prefix | `/api/v1` |
| OpenAPI docs | <http://localhost:8000/docs> · <http://localhost:8000/redoc> |
| Auth | admin endpoints use `Authorization: Bearer <token>` |
| Database | PostgreSQL 16 (SQLAlchemy 2.0 + Alembic) |
| Timezone | `Asia/Tehran` — the API uses Gregorian ISO dates (`YYYY-MM-DD`) and 24h times (`HH:mm`) |
| Currency | Toman, stored as integers |
| Tests | pytest + httpx on an in-memory SQLite database |

## Features

- Public service catalog (`GET /api/v1/services`)
- Day/slot availability with holidays, weekly closing days and the booking window
  (`GET /api/v1/availability`)
- Booking creation, lookup and cancellation with a database level guarantee of **one active
  booking per slot**
- Persian SMS notifications (console provider, ready for a real gateway)
- Per IP rate limiting on the booking endpoint and on the admin login (5 attempts per minute)
- Admin API: service management, booking management (including manual bookings), shop settings,
  holidays and statistics
- One unified error envelope for every failure

## The admin panel

The admin panel of the barbershop is a part of the frontend (`/admin`) and it uses exactly these
endpoints. The credentials come from the environment of the API:

```
ADMIN_USERNAME=admin          # the user name of the admin
ADMIN_PASSWORD=change-me-now  # the plain password (hashed with bcrypt on the first request)
```

Change the password by editing `ADMIN_PASSWORD` in the `.env` of the repository root and by
restarting the API — there is no user table and no password reset endpoint. The token lives for
`ACCESS_TOKEN_EXPIRE_MINUTES` (720 minutes by default).

The endpoints of the panel are listed in [Admin (bearer token)](#admin-bearer-token) below.

## Requirements

- Python 3.12+
- PostgreSQL 16 — or Docker, which provides it

## Quick start with Docker

The compose file lives in the repository root and starts PostgreSQL, the API and the frontend:

```bash
cd ..                       # the repository root
cp .env.example .env
# change SECRET_KEY and ADMIN_PASSWORD in .env
docker compose up --build
```

The migrations are applied automatically by the container entry point.

- Frontend: <http://localhost:8081> (the port comes from `FRONTEND_PORT` in `.env`)
- API: <http://127.0.0.1:8080> — bound to the loopback interface, so it is not reachable from
  outside the machine (the port comes from `API_PORT`)
- Docs: <http://127.0.0.1:8080/docs>
- PostgreSQL: `127.0.0.1:5433` (host only, 5432 is often taken by a local installation)

The frontend container runs the vite dev server and proxies `/api` to `http://api:8000` over the
compose network, so the browser and the API share one origin.

```bash
docker compose logs -f api     # follow the logs
docker compose down            # stop everything
docker compose down -v         # stop and delete the database volume
```

If a host port is reserved by Windows, copy `docker-compose.override.example.yml` to
`docker-compose.override.yml` and move the mapping there.

## Local setup without Docker

```bash
cd backend

# 1. a PostgreSQL server (the compose one is the easiest)
cd .. && docker compose up -d db && cd backend    # PostgreSQL 16 on localhost:5433

# 2. the virtual environment
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # Linux / macOS
pip install -r requirements-dev.txt

# 3. the configuration
# The .env of the repository root configures everything. A local backend/.env may
# override single values (it wins over the root file):
#   DATABASE_URL=postgresql+psycopg://gc:gc@localhost:5433/gentlemans_club

# 4. the database schema and the server
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The default services and the shop settings are seeded on startup (`SEED_ON_START=true`).

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` enables the strict secret validation |
| `API_PORT` | `8000` | Host port of the API in Docker (the container always listens on 8000) |
| `DATABASE_URL` | `postgresql+psycopg://gc:gc@db:5432/gentlemans_club` | SQLAlchemy URL (`db:5432` in compose, `localhost:5433` from the host) |
| `SECRET_KEY` | `change-me-to-a-long-random-string` | JWT signing key — at least 32 characters in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Lifetime of the admin token |
| `ADMIN_USERNAME` | `admin` | Admin username |
| `ADMIN_PASSWORD` | `change-me-now` | Admin password (hashed with bcrypt at startup) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma separated list of allowed origins |
| `SHOP_TIMEZONE` | `Asia/Tehran` | Timezone used for "today" and for the slot generation |
| `SEED_ON_START` | `true` | Seed the services and the shop settings on startup |
| `SMS_PROVIDER` | `console` | SMS implementation (`console` is the only one available) |
| `RATE_LIMIT_BOOKINGS_PER_MINUTE` | `5` | Booking attempts per minute and per IP |

The variables are read from the `.env` of the repository root; a `backend/.env` overrides single
values for a local run (the last file wins).

With `APP_ENV=production` the app **refuses to start** when `SECRET_KEY` is the default value or
shorter than 32 characters, or when `ADMIN_PASSWORD` is the default value.

## API endpoints

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check (also available at `/api/v1/health`) |
| `GET` | `/api/v1/services` | Active services ordered by `sort_order` |
| `GET` | `/api/v1/availability?start=YYYY-MM-DD&days=14` | Availability of the days (`days` ≤ 31) |
| `POST` | `/api/v1/bookings` | Create a booking (rate limited per IP) |
| `GET` | `/api/v1/bookings/{code}?phone=...` | Look up a booking (the phone must match) |
| `POST` | `/api/v1/bookings/{code}/cancel` | Cancel a booking (`{"phone": "..."}`) |

### Admin (bearer token)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/admin/login` | Get an access token (5 attempts per minute and per IP) |
| `GET` | `/api/v1/admin/services` | All services, including the inactive ones |
| `POST` | `/api/v1/admin/services` | Create a service |
| `PATCH` | `/api/v1/admin/services/{id}` | Partial update (the slug is immutable) |
| `DELETE` | `/api/v1/admin/services/{id}` | Soft delete (`is_active=false`) |
| `GET` | `/api/v1/admin/bookings` | `date`, `date_from`, `date_to`, `status`, `q`, `page`, `page_size` |
| `POST` | `/api/v1/admin/bookings` | Create a booking by hand (not rate limited, up to 90 days ahead) |
| `GET` | `/api/v1/admin/bookings/{id}` | A single booking |
| `PATCH` | `/api/v1/admin/bookings/{id}` | Change `status` and/or `admin_note` |
| `GET` | `/api/v1/admin/settings` | Shop settings |
| `PUT` | `/api/v1/admin/settings` | Update the shop settings |
| `GET` | `/api/v1/admin/closed-dates` | Holidays |
| `POST` | `/api/v1/admin/closed-dates` | Add a holiday |
| `DELETE` | `/api/v1/admin/closed-dates/{id}` | Remove a holiday |
| `GET` | `/api/v1/admin/stats/summary` | Dashboard counters |

### Business rules

- **Slots** are hourly from `open_hour` to `close_hour - 1` (10:00 … 20:00 by default).
- A slot is unavailable when the day is closed (weekly closing day or holiday), when it already
  passed, or when a non cancelled booking exists for it.
- **Booking window**: today … today + `booking_window_days` - 1 (14 days by default).
- **One booking per slot** is enforced by a partial unique index in the database
  (`uq_bookings_active_slot`), so two parallel requests can never book the same chair.
- A phone number may hold at most `max_active_bookings_per_phone` active bookings (3 by default).
- A booking can be cancelled while it is still `pending` or `confirmed` and at least
  `cancel_before_hours` (2 by default) before its start time.
- Phone numbers are normalized to `09xxxxxxxxx`; `۰۹۱۲…`, `+98912…`, `0098912…` are all accepted.
- **Admin bookings** (`POST /admin/bookings`) reuse every rule above, but they are not rate
  limited, they lift the per phone number limit of active bookings and they accept dates up to
  90 days ahead. A booking created with the status `confirmed` sends the confirmation SMS.

### Error format

Every failure — including validation errors, 404, 401 and 429 — uses the same envelope:

```json
{ "error": { "code": "slot_taken", "message": "این ساعت قبلاً رزرو شده است.", "details": null } }
```

Validation errors use the code `validation_error` and a `details` list of
`{ "field": "name", "message": "…" }` objects.

| Code | Status | Meaning |
| --- | --- | --- |
| `service_not_found` | 404 | Unknown or inactive service |
| `date_out_of_range` | 422 | The date is outside the booking window |
| `day_closed` | 409 | The shop is closed that day |
| `invalid_time` | 422 | The time is not one of the working slots |
| `slot_in_past` | 409 | The slot has already started |
| `slot_taken` | 409 | Somebody else booked that slot |
| `too_many_active_bookings` | 409 | Too many active bookings for this phone number |
| `invalid_phone` | 422 | The phone number could not be normalized |
| `booking_not_found` | 404 | Unknown code, or the phone number does not match |
| `cancel_not_allowed` | 409 | The booking can no longer be cancelled |
| `rate_limited` | 429 | Too many booking attempts (or login attempts) from this IP |
| `unauthorized` | 401 | Missing or invalid admin token |
| `invalid_credentials` | 401 | Wrong admin username or password |
| `already_exists` | 409 | Duplicate slug or duplicate holiday |
| `invalid_status_transition` | 409 | The booking status cannot be changed that way |
| `invalid_settings` | 422 | The resulting shop settings are not valid |
| `validation_error` | 422 | The request body or the query parameters are invalid |

## curl examples

```bash
# Health
curl http://localhost:8000/health

# Services
curl http://localhost:8000/api/v1/services

# Availability of the next 7 days
curl "http://localhost:8000/api/v1/availability?start=2026-10-21&days=7"

# Create a booking
curl -X POST http://localhost:8000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{"service_id":"beard","date":"2026-10-21","time":"10:00","name":"علی رضایی","phone":"۰۹۱۲۱۲۳۴۵۶۷"}'

# Look up a booking
curl "http://localhost:8000/api/v1/bookings/123456?phone=09121234567"

# Cancel a booking
curl -X POST http://localhost:8000/api/v1/bookings/123456/cancel \
  -H "Content-Type: application/json" \
  -d '{"phone":"09121234567"}'

# Admin login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change-me-now"}' | python -c "import json,sys;print(json.load(sys.stdin)['access_token'])")

# List the bookings of a day
curl "http://localhost:8000/api/v1/admin/bookings?date=2026-10-21&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

# Confirm a booking
curl -X PATCH http://localhost:8000/api/v1/admin/bookings/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"confirmed","admin_note":"تماس گرفته شد"}'

# Create a booking by hand (admin)
curl -X POST http://localhost:8000/api/v1/admin/bookings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"service_id":"beard","date":"2026-10-21","time":"11:00","name":"علی رضایی","phone":"۰۹۱۲۱۲۳۴۵۶۷","status":"confirmed"}'

# Update the shop settings
curl -X PUT http://localhost:8000/api/v1/admin/settings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"open_hour":11,"close_hour":22,"closed_weekdays":[4]}'
```

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
ruff check .
```
The suite runs on an in-memory SQLite database and never touches PostgreSQL. The clock is frozen
at Monday 2026-10-19 09:30 (Asia/Tehran) so the results are deterministic.

## Project layout

```
backend/
  app/
    main.py            # application factory, lifespan, CORS, middleware, routers
    core/              # config, security, errors, rate limit, middleware, time, phone
    db/                # declarative base, engine, session dependency
    models/            # SQLAlchemy models
    schemas/           # Pydantic schemas
    services/          # business logic (no FastAPI imports)
    api/               # dependencies and routers
    seed.py            # idempotent seed data
  alembic/             # database migrations
  tests/               # pytest suite
  Dockerfile           # api image
  docker-compose.yml   # api + postgres
```

## Notes

- The API never returns ORM objects, always Pydantic schemas.
- Every request gets an `X-Request-ID` header; it is returned in the response and written to the
  log. Phone numbers are masked in the logs (`0912***4567`).
- The SMS provider is called in a background task; a failing provider never breaks a request.
- The database migration `20261020_1443_ae5efe84852e_initial_schema.py` creates all four tables
  and the partial unique index.
