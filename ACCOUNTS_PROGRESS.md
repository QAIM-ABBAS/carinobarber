# ACCOUNTS — progress (customer accounts with phone verification)

Backend part is owned by another agent working in parallel; this file records the FRONTEND
phases. Both agents append only their own sections.

## Done phases (frontend)

### Phase 1 — Frontend foundation ✅

Created:

- `frontend/src/auth/storage.ts` — customer session in `localStorage` under `gc_customer`
  (`{token, expiresAt, user}`); try/catch around every access; expired/broken values removed.
- `frontend/src/auth/AuthContext.ts` — `AuthContext` + `useAuth()`
  (`{user, token, isAuthenticated, login, logout, refreshUser}`).
- `frontend/src/auth/AuthProvider.tsx` — provider; registers the API client's 401 handler
  (ends the session everywhere), re-checks the token expiry every 30 s while the tab is open.
- `frontend/src/account/LoginCard.tsx` — «ورود یا ثبت‌نام» card: step 1 phone (client-side
  Iranian-mobile validation + `requestOtp`), step 2 `OtpVerify` (with `askName` only when the
  answer says `is_new_user`); after verify stores the session and returns to
  `location.state.from` (internal paths only) if present.
- `frontend/src/components/OtpVerify.tsx` — shared OTP step (dev box, resend countdown,
  Persian-digit input with auto-submit, exact server messages, `name_required` → name field
  and resubmit of the SAME code, `aria-live` errors). Used by «حساب» and, later, `/book`.
- `frontend/src/account.css` — all new styles, `.ac-` prefix; the page shell reuses
  `.hero--page` + `HeroBackground` + `Header` like `/book` and `/services`.
- `frontend/src/pages/AccountPage.tsx` — logged out: login card. Logged in (Phase 1
  scaffold, completed in Phase 2): title «حساب من», avatar + name + phone rows, «رزرو نوبت
  جدید» → `/book`, «خروج از حساب».

Changed:

- `frontend/src/main.tsx` — public app wrapped in `<AuthProvider>` (inside `BrowserRouter`).
- `frontend/src/App.tsx` — new route `/account` (eager, like the other public pages).
- `frontend/src/data/content.ts` — `navItems` ends with `{ label: 'حساب', href: '/account' }`.
- `frontend/src/lib/api.ts` — `Authorization: Bearer <token>` attached from the customer
  session; 401 clears the session and fires the registered handler; new typed endpoints
  `requestOtp`, `verifyOtp`, `getMe`, `updateMe`, `getMyBookings(scope)`, `cancelMyBooking`;
  `CreateBookingInput` now has NO phone (the token carries it).
- `frontend/src/lib/booking.ts` — `submitBooking` no longer sends a phone.

Tests (`npm test`, vitest, jsdom — also run by the existing admin tests, all 68 green):

- `frontend/src/auth/storage.test.ts` (8) — roundtrip incl. user, expiry, corrupted JSON,
  incomplete value, storage throwing on read/write.
- `frontend/src/auth/AuthProvider.test.tsx` (6) — starts logged out, picks up a stored
  session, login persists, logout clears, 401 via `refreshUser` ends the session,
  `refreshUser` syncs the storage.
- `frontend/src/lib/customerApi.test.ts` (6) — bearer header attached / omitted, 401 →
  session cleared + handler called (409 does NOT touch the session), request/verify bodies.
- `frontend/src/components/OtpVerify.test.tsx` (11) — dev box on `dev_code` only, Persian
  digits normalized + auto-submit, wrong code shows «(۴ تلاش باقی مانده)», expired message,
  `name_required` → name field + same code resubmitted, `askName`, autofill from dev box,
  resend after cooldown (fake timers), rate limit → `retry_after` restarts the cooldown,
  «ویرایش شماره».

Checks run after Phase 1: `npm run typecheck` ✅ · `npm test` (68/68) ✅ · `npm run build` ✅
(Admin suite untouched and green; public bundle stays free of admin code.)

### Phase 2 — Account page ✅

Created:

- `frontend/src/account/bookingView.ts` — `statusLabel` (fixed Persian labels per status) and
  `formatBookedAt` (Jalali via `Intl.DateTimeFormat('fa-IR-u-ca-persian')`, Persian digits,
  e.g. «شنبه ۱ فروردین، ساعت ۱۰:۳۰»).
- `frontend/src/account/BookingStatus.tsx` — coloured badge with `data-status`
  (pending amber, confirmed green, completed, cancelled red, no_show violet; the Persian text
  is always shown, colour is not the only signal).
- `frontend/src/account/BookingCard.tsx` — card: service name, Jalali date + time, price +
  «تومان», tracking code (`<bdi dir="ltr">`), badge, «لغو نوبت» only when `can_cancel`.
- `frontend/src/components/ConfirmDialog.tsx` — the public-side accessible confirm dialog
  (`role=dialog`, `aria-modal`, labelled by its title, focus trap, Escape + backdrop close,
  focus restored to the opener, disabled buttons + spinner while pending).
- `frontend/src/account/BookingsSection.tsx` — tablist «نوبت‌های پیش‌رو»/«سابقه نوبت‌ها» with
  full ARIA tabs (`aria-selected`, `aria-controls`, arrow-key switching while keeping one
  tab stop), both panels stay mounted and toggle `hidden`; loading skeletons, empty state
  (+ «رزرو نوبت جدید» → `/book`), error state (+ «تلاش دوباره»); cancel flow opens the
  ConfirmDialog and shows an inline `aria-live` notice on success/failure; both scopes are
  refreshed after a cancel.
- `frontend/src/account/ProfileCard.tsx` — avatar circle with the first letter of the name,
  inline name edit (pencil → input → save/cancel; `PATCH /me` then `refreshUser`;
  client-side 2–100 validation, server message on top), read-only phone in Persian digits,
  «رزرو نوبت جدید» and «خروج از حساب»; «نام شما ذخیره شد.» clears itself after 4 s.

Changed:

- `frontend/src/pages/AccountPage.tsx` — logged in: ProfileCard + BookingsSection inside
  `.ac-stack`, title «حساب من»; logged out unchanged (login card from Phase 1).
- `frontend/src/components/icons.tsx` — added PencilIcon, CheckIcon, XIcon.
- `frontend/src/account.css` — profile rows as a grid (avatar | label | value | action),
  `.ac-stack`, tab strip without extra top margin, price `<small>`, skeleton
  `display:block`.

Tests (added 19 → suite is 87 green across 12 files):

- `components/ConfirmDialog.test.tsx` (5) — labelled modal, renders nothing when closed,
  focus moves in and returns to the opener, Escape + backdrop close, tab looping, loading
  disables both buttons.
- `account/bookingView.test.ts` (4) — every status label + unknown fallback, Jalali
  formatting with Persian digits, local (no UTC-shift) ISO date parsing.
- `account/ProfileCard.test.tsx` (6) — name/phone/actions, logout, short-name rejection
  (no request), PATCH body + `refreshUser` + updated name + saved note, server rejection
  keeps the editor open, cancel is request-free.
- `account/BookingsSection.test.tsx` (4) — both lists with badges/prices/codes, cancel
  (dialog → POST → notice + both GETs again), 409 keeps the booking and shows the server
  message, error state retry (in-memory fetch router in the test file).

Checks run after Phase 2: `npm run typecheck` ✅ · `npm test` (87/87) ✅ · `npm run build` ✅

Browser smoke (dev server, backend down): with a seeded `gc_customer` session the logged-in
page renders profile + tabs correctly, switching tabs works, and both booking scopes show
the Persian server-error state with «تلاش دوباره»; console shows only the expected API
network failures. The live end-to-end (login → bookings → cancel against the real API) is
deferred to Phase 4; the runtime DB is the Dockerized PostgreSQL on `:5433`, which was not
running.

### Phase 3 — Booking flow ✅

Created:

- `frontend/src/components/BookingVerifyCard.tsx` — the code step of the booking form,
  presented as another numbered `fieldset.step` (legend «۴ تأیید شماره موبایل») wrapping the
  shared `OtpVerify`; while the booking is being created it shows the status line
  «کد تأیید شد؛ در حال ثبت نوبت…».
- `frontend/src/pages/BookingPage.test.tsx` (5 tests, details below).

Changed:

- `frontend/src/pages/BookingPage.tsx` — the form area now follows a small state machine
  `SubmitStatus = idle | submitting | requesting | otp | creating | done`. The form renders at
  `idle | submitting`; `otp | creating` replace it with `BookingVerifyCard` while the summary
  aside stays visible; `done` is the success screen with the new link
  «مشاهده نوبت‌ها در حساب من» → `/account`. Logged out: submit validates, calls `requestOtp`
  and switches to the verify step — every selection stays in state, so «ویرایش شماره» returns
  to the form without losing anything. After a verified code the page calls
  `login(access_token, user, expires_in)` and books automatically; a booking is NEVER created
  before verification. Logged in: no code step at all; step 4 shows the name prefilled from
  the account (editable per booking) and the phone as a read-only row «شماره شما: …» in
  Persian digits; the client-side phone validation is skipped in that case.
- Error recovery: a failed `createBooking` after verification shows the server's Persian
  message, and for the availability-related codes (`slot_taken`, `slot_in_past`,
  `date_out_of_range`, `day_closed`, `invalid_time`) clears the time, reloads availability and
  scrolls back to step 3 — the user stays logged in, so the retry needs no second code.
- `frontend/src/lib/booking.ts` — `BookingPayload` has no phone (doc updated; the body is
  exactly `{service_id, date, time, name}`).
- `frontend/src/booking.css` — `.book__phone`, `.book__hint`, `.book__verify-note`.

Tests (`pages/BookingPage.test.tsx` — in-memory fetch router, `MemoryRouter`, `act` imported
from `@testing-library/react` per decision 12; the harness's `login` really swaps the user):

1. logged-out happy path — Persian-digit phone input, `{phone}` request body, code verify →
   login called with the server answer, booking body asserted WITHOUT any phone, success
   screen with «مشاهده نوبت‌ها در حساب من»;
2. `slot_taken` after verification — back on step 3 with the availability reloaded
   (2 fetches), server message shown, resubmit books WITHOUT a second code request;
3. «ویرایش شماره» — every selection kept, second submit asks for a fresh code;
4. logged-in visitor — name prefilled, read-only phone row, zero OTP requests, one
   `POST /bookings`;
5. invalid phone stops client-side — zero requests, still on the form.

Checks run after Phase 3: `npm run typecheck` ✅ · `npm test` (92/92 across 13 files) ✅ ·
`npm run build` ✅ (the first `npm test` attempt hit vitest fork-worker start timeouts under
machine load from the parallel agent; the rerun of the whole suite was green in 20 s).

## Decisions (frontend)

1. **`OtpVerify` props** — the spec's `onVerified(user)` is extended to
   `onVerified(result: OtpVerifyResult)`: the caller needs `access_token` + `expires_in` to
   call `login(token, user, expiresIn)`. The user itself rides inside the result.
2. **First OTP request** — the caller (LoginCard) makes the FIRST `requestOtp` so it can see
   `is_new_user` before choosing `askName`, then hands the answer to `<OtpVerify initial={…}>`.
   `OtpVerify` owns all RESENDS (and falls back to requesting on mount when no `initial` is
   given). This avoids creating two competing codes.
3. **Code input** — one single numeric input (underline style, letterSpacing, `dir="ltr"`)
   instead of 6 boxes: RTL-safe, autofill/one-time-code friendly.
4. **Input digits** — typed Persian/Arabic digits are normalized to plain digits inside the
   input; the dev box shows the code in Persian digits.
5. **Rate limit in the OTP step** — on `otp_rate_limited` the resend cooldown restarts with
   the server's `details.retry_after`, so the button can only appear when the server allows.
6. **Auto-submit guard** — a completed 6-digit code is auto-verified once per code value
   (`lastSubmitted` ref); after an error the same code is never auto-resent (the manual
   «تأیید و ورود» button still retries it, e.g. with the newly asked name).
7. **`from` return path** — only internal paths (`/…`) are accepted from `location.state`.
8. Storage stays `localStorage` (customer) — the admin keeps its own `sessionStorage`.
9. **Tabs** — both tab panels always stay in the DOM with `hidden`, so switching is instant
   and React state (already loaded lists) is kept. RTL role queries respect `hidden`, so the
   tests scope assertions with `within(getByRole('tabpanel', { name }))` on the visible one.
10. **ConfirmDialog** lives in public `components/` (no admin imports); it captures
    `document.activeElement` on open and restores it on close. Cancel feedback is an inline
    `aria-live` notice above the cards, not a toast.
11. **Name edit** — after `PATCH /me` succeeds the card re-reads the profile through
    `refreshUser()` only; there is no duplicated local name state.
12. **`act` in tests** — vitest runs with `globals: false`, so RTL's automatic setup hook
    (which sets `IS_REACT_ACT_ENVIRONMENT`) never fires; tests import `act` from
    `@testing-library/react` (its wrapper sets/restores the environment per call) instead of
    from `react`.
13. **Test harnesses** — ProfileCard tests render a tiny harness whose `refreshUser`
    actually swaps the user (like the real AuthProvider) so the new name is asserted;
    ProfileCard/BookingsSection tests wrap `MemoryRouter` because public cards contain
    `<Link>` (react-router v7 requires router context).
14. **Booking verify step** — `OtpVerify` is not lazily inlined into the booking form;
    `BookingVerifyCard` presents it as step «۴ تأیید شماره موبایل» so the flow keeps the same
    fieldset look. After login the card is replaced by the «در حال ثبت نوبت…» status, so a
    consumed code can never be re-entered.
15. **Name rides into the verify request** — the booking name from step 4 is handed to
    `OtpVerify` (`name` prop) so a NEW phone never types its name twice; if the server still
    answers `name_required` (name missing/too short), `OtpVerify` reveals its own name field
    and resubmits the same code.
16. **Recovery codes** — `slot_taken | slot_in_past | date_out_of_range | day_closed |
    invalid_time` clear the time, reload availability and scroll to step 3; every other
    error keeps all selections and only shows the message above the submit button.
17. **Booking test wiring** — the module-level `fetchMock` is adopted by the page's
    `makeRouter` via `mockImplementation`; `flush()` (12 `act` rounds) is awaited before
    querying anything that appears after a fetch, which keeps the fireEvent steps synchronous.
18. **Done-screen phone** — after verification the phone comes from the account
    (`user?.phone`), falling back to `normalizePhone(phone)` for a not-yet-linked legacy
    booking shape; shown `dir="ltr"`.

## How to run (frontend)

```
cd frontend
npm run typecheck
npm test
npm run build
npm run dev   # http://localhost:5173  →  /account and /book (API needs the backend up)
```

On this machine the three checks are run as separate PowerShell commands (chaining is
unreliable there), and `npm test` should run when the machine is idle: under parallel load
the vitest fork pool can time out while starting workers — a plain rerun passes.

To see the logged-in account UI without a backend, seed a session first (dev-only helper):

```js
localStorage.setItem('gc_customer', JSON.stringify({
  token: 'dev', expiresAt: Date.now() + 86400000,
  user: { id: 'u1', name: 'پیش‌فرض', phone: '09120000000' },
}))
```

The login card needs the backend `/auth/otp/*` endpoints (built by the parallel agent).
In dev mode the OTP code appears on screen inside the brass dev box.

## Next

- Phase 4 (frontend): responsive pass (360/768/1280), keyboard/a11y pass (focus order,
  labels, ConfirmDialog focus trap), RTL check of the OTP input (digits stay LTR inside the
  box), docs section «حساب کاربری» in the root `README.md` (login, `OTP_DEV_MODE`, exact
  steps to switch to real SMS; there is no `DEPLOY.md` in the repo), final checks.
- Then the live whole-stack smoke of the FINAL CHECKLIST items 1–7 — it needs the runtime
  PostgreSQL on `:5433` (e.g. `docker compose up` for the DB service or an equivalent server;
  the backend never serves runtime traffic from SQLite).

---

## Backend — Phase 0 ✅ (owned by the backend agent)

The backend side of the feature is complete and verified. The frontend phases above are
owned by the parallel frontend agent; no `frontend/` file was changed by the backend work.

### What was built

- **Customer accounts**: `users` (id, normalized 11-digit phone, name, timestamps,
  `last_login_at`) and `bookings.user_id` (nullable, indexed FK). Old bookings remain valid
  and are linked to the account the first time that phone logs in.
- **OTP service** (`app/services/otp.py`): 6 digits from `secrets`, stored only as
  HMAC-SHA256 of `"{phone}:{code}"` keyed with `SECRET_KEY`, `hmac.compare_digest`,
  configurable TTL, 5 attempts, single use, invalidation of older codes, 60 s resend
  cooldown, 5 requests/hour/phone, 10 requests/minute/IP and opportunistic deletion of
  rows older than one day. Time always comes from the injectable `get_now()`.
- **API** (all under `/api/v1`):
  - `POST /auth/otp/request` → `expires_in`, `resend_after`, `is_new_user`, `dev_code`
    (only in dev mode).
  - `POST /auth/otp/verify` → customer JWT + user; asks for `name` only for a new phone
    and does not consume the code when the name is missing/short.
  - `GET /me`, `PATCH /me` (name only; 2–100 characters after strip).
  - `GET /me/bookings?scope=upcoming|past|all` with `can_cancel`.
  - `POST /me/bookings/{code}/cancel` (404 for another user's code, 409 when too late,
    same cancellation SMS as the public route).
  - `POST /bookings` now requires a customer token; the phone always comes from the token,
    a legacy `phone` field in the body is ignored, and the booking keeps the requested name.
  - Public lookup/cancel-by-code-and-phone are unchanged.
- **JWT roles**: every token has `role`. Admin dependencies accept only `role="admin"`;
  customer dependencies accept only `role="customer"` with `sub=<user id>`. Customer tokens
  live `CUSTOMER_TOKEN_EXPIRE_DAYS` (30 days by default).
- **Startup warning**: `OTP_DEV_MODE=true` together with `APP_ENV=production` logs a loud
  security warning but the app still starts (SMS is not configured yet).
- **Migration**: `backend/alembic/versions/20261025_1800_4c1d2e3f5a6b_customer_accounts.py`
  (revision `4c1d2e3f5a6b`, parent `9f4c2a7b6d10`). It also has a working downgrade.

### Changed / added files (backend)

- Added: `app/models/user.py`, `app/models/otp_code.py`, `app/schemas/auth.py`,
  `app/services/otp.py`, `app/services/accounts.py`, `app/api/v1/accounts.py`, the migration,
  `tests/test_auth_otp.py`, `tests/test_otp_limits.py`, `tests/test_accounts.py`.
- Changed: `app/core/config.py`, `app/core/security.py`, `app/core/rate_limit.py`,
  `app/core/phone.py`, `app/api/deps.py`, `app/api/v1/public.py`, `app/api/v1/router.py`,
  `app/models/booking.py`, `app/schemas/booking.py`, `app/services/bookings.py`,
  `app/services/sms.py`, `app/main.py`, `backend/.env.example`, root `.env.example`,
  root `docker-compose.yml`, and the booking/hardening/model tests/fixtures.
- `tests/conftest.py` provides `customer_headers`, `customer_user` and a
  `customer_headers_for_phone` factory; `tests/helpers.py` creates users/tokens.

### Decisions (backend)

1. **Old admin tokens** — tokens issued before this change have no `role` claim and are now
   rejected immediately (401), not silently upgraded. An admin must log in again once after
   deploying this change.
2. **Dev mode** — when `OTP_DEV_MODE=true` the code is returned as `dev_code` and no SMS is
   sent (there is no real provider); when false `dev_code` is always `null` and the code is
   sent synchronously through the existing `SmsProvider` (`ConsoleSmsProvider` today).
3. **Error order** — a missing/short name with a correct code returns `name_required` and
   leaves the code untouched, so the client can resubmit the same code with a name.
4. **Rate limits** — resend/hourly limits are stored in `otp_codes` (persistent, per phone),
   while the 10/min limit reuses the existing in-memory limiter (per IP). Every 429 carries
   `details.retry_after`.
5. **No plain OTP in logs** — OTP code, hash or full phone is never logged; the only full
   phone output is the console SMS provider's message. A failed SMS log masks the phone
   (`0912***4567`).
6. **Bookings** — `POST /bookings` uses the authenticated user's phone; the body schema
   ignores a legacy `phone` field. Admin-created bookings automatically link to an existing
   user with the same phone, otherwise stay `NULL`.
7. **Cancellation rule** — extracted as `is_cancellable()` in `services/bookings.py` and used
   by both the existing public cancel flow and the account list/cancel endpoints.
8. **Account ordering** — `upcoming` is ascending by date/time; `past` and `all` are
   descending. A cancelled/completed/no-show booking is never in `upcoming`.
9. **Cleanup** — OTP rows older than one day are deleted on both OTP request and verify.

### Configuration

```env
OTP_DEV_MODE=true
OTP_TTL_SECONDS=120
OTP_RESEND_SECONDS=60
OTP_MAX_PER_HOUR=5
CUSTOMER_TOKEN_EXPIRE_DAYS=30
```

The values are in both `.env.example` files, `core/config.py` and the root
`docker-compose.yml` API environment. `OTP_DEV_MODE` defaults to true so the UI can show the
code until a real SMS provider is added.

### How to run / try the backend

```powershell
cd backend
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```bash
# 1. request a code (dev mode returns it)
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" -d "{\"phone\":\"09121234567\"}"

# 2. verify it (name is required only for a new phone)
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"09121234567\",\"code\":\"123456\",\"name\":\"علی رضایی\"}"

# 3. use the returned access_token
curl http://localhost:8000/api/v1/me -H "Authorization: Bearer <access_token>"
```

For a booking, take a valid future date/time from `GET /api/v1/availability` and call
`POST /api/v1/bookings` with the token and `{service_id,date,time,name}` (no phone).

### Verification

- `cd backend` → `.venv\Scripts\python.exe -m pytest -q -o addopts=''` → **215 passed**.
- `.venv\Scripts\python.exe -m ruff check .` → **All checks passed**.
- **Fresh PostgreSQL**: a disposable local PostgreSQL 18 cluster was initialized on
  `127.0.0.1:55434`; `alembic upgrade head` completed successfully, `alembic current` reported
  `4c1d2e3f5a6b (head)`, and the schema contained `users`, `otp_codes`, `bookings` with a
  nullable `bookings.user_id`. The cluster was then removed.
- **SQLite chain note**: the full Alembic chain on SQLite still stops earlier in the
  pre-existing `20261025_1200_9f4c2a7b6d10_service_images.py` migration
  (`ALTER TABLE services ALTER COLUMN images DROP DEFAULT` is PostgreSQL syntax). That
  failure is unrelated to the new migration; the test suite itself runs on SQLite and is green.
- The PostgreSQL offline SQL generation for the new migration also succeeds.

### Not in this backend phase

Navbar «حساب», `OtpVerify`, `/account`, booking-page OTP integration and the documentation
section belong to the frontend phases above / the other agent. The backend endpoints and
response shapes they consume are ready.

