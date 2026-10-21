# ADMIN_PROGRESS — پنل مدیریت «باشگاه جنتلمن‌ها»

وضعیت کار پنل مدیریت (Admin Panel). هر فاز بعد از اتمام، این فایل به‌روز می‌شود.

| فاز | دامنه | وضعیت |
| --- | --- | --- |
| 0 | بازرسی مخزن + افزودن‌های بک‌اند | ✅ انجام شد |
| 1 | پایه: احراز هویت، کلاینت API، چیدمان، اجزای مشترک، صفحه ورود | ⏳ بعدی |
| 2 | داشبورد + نوبت‌ها | ⏳ |
| 3 | خدمات + تنظیمات + تعطیلات | ⏳ |
| 4 | پولیش، تست دستی، مستندات | ⏳ |

---

## فاز ۰ — بازرسی + افزودن‌های بک‌اند (انجام شد)

### ۱) چیدمان واقعی مخزن (برخلاف فرض اولیهٔ صورت مسئله)

فرانت‌اند داخل پوشهٔ `frontend/` است (نه در ریشهٔ مخزن) و بک‌اند در `backend/`:

```
.
├── .env / .env.example        # پیکربندی مشترک کل استک
├── docker-compose.yml
├── README.md
├── frontend/                  # React 19 + Vite + TypeScript + Tailwind v4
│   ├── package.json  vite.config.ts  tsconfig.json
│   └── src/
│       ├── App.tsx  main.tsx  index.css  booking.css  services.css
│       ├── components/  (Header, Hero, ServicesList, icons.tsx, …)
│       ├── data/         (content.ts, serviceDetails.ts)
│       ├── lib/          (api.ts, booking.ts, useServices.ts)
│       └── pages/        (BookingPage.tsx, ServicesPage.tsx)
└── backend/                   # FastAPI + SQLAlchemy 2 + Alembic
    ├── app/api/v1/  (admin.py, public.py, router.py, deps.py)
    ├── app/core/    (config, errors, middleware, phone, rate_limit, security, timeutil)
    ├── app/models/  (booking, closed_date, service, shop_settings)
    ├── app/schemas/ (admin, availability, booking, common, service)
    ├── app/services/(admin, availability, bookings, catalog, sms)
    └── tests/       (148 تست پیشین)
```

- **`deploy/Caddyfile` وجود ندارد** → تغییری در دیپلوی انجام نشد (طبق دستور «اگر وجود داشته باشد»).
  هدر `X-Robots-Tag` در فاز ۴ در مستندات توصیه می‌شود.
- فرانت‌اند **Tailwind v4 دارد ولی از آن استفاده نمی‌کند**؛ کل طراحی با CSS دستی (`index.css`,
  `booking.css`, `services.css`) انجام شده است. پنل مدیریت هم با CSS دستی و پیشوند `.ad-`
  نوشته می‌شود تا با همین زبان بصری هم‌خوان بماند.
- تست‌های بک‌اند: `pytest` (۱۴۸ تست) + `ruff check` + `ruff format --check`.

### ۲) چطور سایت عمومی `VITE_API_URL` را می‌خواند

- `frontend/src/lib/api.ts`: `const RAW_BASE = String(import.meta.env.VITE_API_URL ?? '').trim()`
  → `API_BASE = RAW_BASE.replace(/\/+$/, '')` و `API_PREFIX = '/api/v1'`.
  اگر `VITE_API_URL` خالی باشد (پیش‌فرض `.env` ریشه) درخواست‌ها نسبی و هم‌مبدأ می‌شوند.
- `frontend/vite.config.ts`: `envDir: '..'` (فایل `.env` ریشه خوانده می‌شود) و پراکسی توسعه:
  `'/api' → API_PROXY_TARGET || http://localhost:${API_PORT || 8000}`. پراکسی **از قبل موجود بود**.
- کلاینت عمومی، پوشش خطای یکپارچهٔ `{"error":{code,message,details}}` را می‌فهمد و `ApiError`
  می‌سازد (`src/lib/api.ts`) — پنل مدیریت کلاینت مشابه خواهد داشت (در `src/admin/api/client.ts`).

### ۳) اختلاف‌های «کد بک‌اند» با خلاصهٔ API

کد بک‌اند مرجع است؛ موارد زیر با خلاصه فرق دارد (و در کد رعایت شده‌اند):

| مورد | خلاصه | کد واقعی |
| --- | --- | --- |
| `GET /admin/settings` | ۵ فیلد | + `id` و `updated_at` |
| `GET /admin/services` | بدون `id` | `id` عددی، `slug`، `created_at`، `updated_at` هم هست |
| `POST /admin/services` | — | کد ۲۰۱؛ `description` **اجباری** است (`min_length=1`) |
| `DELETE /admin/services/{id}` | — | کد ۲۰۰ و خود سرویس را برمی‌گرداند (`is_active=false`) |
| `DELETE /admin/closed-dates/{id}` | — | کد ۲۰۴ بدون بدنه |
| `POST /admin/closed-dates` | — | کد ۲۰۱ |
| خطای اعتبارسنجی | — | کد `validation_error` با `details` = لیست `{field, message}` |
| `POST /admin/bookings` | — | **جدید** (افزودن فاز ۰) |
| `GET /admin/bookings/{id}` | — | **جدید** (افزودن فاز ۰) |
| سقف `GET /availability` | `days` | `days ≤ 31` و بازه به پنجرهٔ رزرو کلاب‌شدگی می‌شود |

نکتهٔ مهم برای فرانت‌اند: **بازهٔ `/availability` همیشه به پنجرهٔ رزرو محدود است**
(`booking_window_days`، پیش‌فرض ۱۴ روز). پنل مدیریت برای ساختن فهرست ساعت‌ها از همین
سرویس استفاده می‌کند، پس بازهٔ انتخاب تاریخ در فرم «ثبت نوبت دستی» همان پنجرهٔ رزرو است
(تصمیم در بخش «تصمیم‌ها»).

### ۴) افزودن‌های بک‌اند انجام‌شده

| فایل | تغییر |
| --- | --- |
| `backend/app/core/rate_limit.py` | لیمیتر دوم (وظیفهٔ ورود) با `LOGIN_ATTEMPTS_PER_MINUTE = 5`، وابستگی `rate_limit_login`، `reset_rate_limiter()` حالا هر دو لیمیتر را پاک می‌کند |
| `backend/app/schemas/admin.py` | اسکیمای `AdminBookingCreate` (`service_id`, `date`, `time`, `name`, `phone`, `status: pending\|confirmed` پیش‌فرض `confirmed`, `admin_note`) |
| `backend/app/services/bookings.py` | استخراج `create_booking_record()` از `create_booking()`؛ سه پارامتر اختیاری: `status`، `max_days_ahead`، `enforce_phone_cap` |
| `backend/app/services/admin.py` | `create_admin_booking()`، `get_booking()`؛ `update_booking()` حالا از `get_booking()` استفاده می‌کند |
| `backend/app/api/v1/admin.py` | `POST /admin/bookings` (۲۰۱)، `GET /admin/bookings/{id}`، لیمیت ورود روی `POST /admin/login` |
| `backend/tests/test_admin_bookings.py` | ۲۵ تست جدید |
| `backend/tests/test_admin_login.py` | ۵ تست جدید |
| `backend/README.md` | جدول endpointها، قوانین کسب‌وکار، کدهای خطا و نمونه‌های curl به‌روز شد |

قواعد `POST /api/v1/admin/bookings`:

- **بدون محدودیت نرخ** (برخلاف `POST /bookings` عمومی) و **بدون سقف نوبت فعال برای هر شماره**.
- تاریخ‌ها تا **۹۰ روز جلوتر** از امروز پذیرفته می‌شوند (`ADMIN_BOOKING_MAX_DAYS_AHEAD = 90`).
- همچنان اعمال می‌شود: خدمت فعال (۴۰۴ `service_not_found`)، روز تعطیل نبودن (۴۰۹ `day_closed`)،
  ساعت کاری معتبر (۴۲۲ `invalid_time`)، ساعت در گذشته نبودن (۴۰۹ `slot_in_past`)،
  یکتا بودن اسلات (۴۰۹ `slot_taken` از ایندکس دیتابیس) و موبایل معتبر (۴۲۲ `invalid_phone`).
- شماره موبایل مثل سرویس عمومی نرمال می‌شود (`۰۹۱۲۱۲۳۴۵۶۷`).
- پیامک تأیید فقط برای وضعیت `confirmed` ارسال می‌شود (`pending` بدون پیامک).
- پاسخ هم‌شکل آیتم‌های لیست نوبت‌هاست (`id, code, status, service{id,label}, date, time, name,
  phone, price_at_booking, admin_note, created_at`).

`POST /api/v1/admin/login`: حداکثر **۵ تلاش در دقیقه برای هر IP**؛ تلاش ششم ۴۲۹ با کد
`rate_limited` و پیام فارسی «تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.»
(همهٔ تلاش‌ها شمرده می‌شوند، حتی تلاش موفق).

### ۵) تست‌ها

```
cd backend
pytest          → 178 passed (148 قبلی + 30 جدید)
ruff check .    → All checks passed!
ruff format --check . → 53 files already formatted
```

تست دستی زنده (HTTP واقعی، با یک دیتابیس موقت SQLite چون Docker در این ماشین بالا نبود):

| بررسی | نتیجه |
| --- | --- |
| `POST /admin/login` (صحیح) | 200، `bearer`، `expires_in = 43200` |
| `POST /admin/bookings` (دستی) | 201، `id=1`، `code=975284`، `status=confirmed`، موبایل `۰۹۱۲…` → `09121234567`، یادداشت ذخیره شد |
| همان اسلات دوباره | 409 `slot_taken` — «این ساعت قبلاً رزرو شده است.» |
| `GET /admin/bookings/{id}` | 200 با همان شکل آیتم لیست؛ شناسهٔ ناموجود → 404 `booking_not_found` |
| `/availability` عمومی | اسلات ۱۲:00 بعد از ثبت `available: false` و بعد از لغو دوباره `available: true` |
| تاریخ خیلی دور / جمعه / ساعت نامعتبر / موبایل بد / خدمت ناموجود | 422 `date_out_of_range` / 409 `day_closed` / 422 `invalid_time` / 422 `invalid_phone` / 404 `service_not_found` |
| لیمیت ورود | `[401,401,401,401,429]` و پیام «تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.» |

(فایل‌های کمکی تست زنده بعد از اجرا حذف شدند؛ چیزی در مخزن باقی نمانده است.)

### ۶) تصمیم‌ها

- **پنجرهٔ ۹۰ روزه فقط در API**: چون لیست ساعت‌های آزاد از `/availability` گرفته می‌شود و آن
  سرویس به پنجرهٔ رزرو کلاب‌شدگی است، انتخابگر تاریخ در فرم «ثبت نوبت دستی» محدود به
  `امروز … امروز + booking_window_days − 1` است. مدیر می‌تواند با بزرگ‌کردن
  `booking_window_days` (تا ۶۰ روز) این بازه را خودش بزرگ‌تر کند.
- **افزودن endpoint جدید برای availability انجام نشد** تا قرارداد بک‌اند همان چیزی بماند که در
  صورت مسئله آمده (۳ افزودنی).
- **پیامک فقط برای `confirmed`**: دقیقاً مطابق صورت مسئله.
- **لیمیتر ورود جدا از لیمیتر رزرو** ولی از همان کلاس `RateLimiter` و همان پنجرهٔ ۶۰ ثانیه
  استفاده می‌کند؛ `reset_rate_limiter()` هر دو را پاک می‌کند تا تست‌ها مستقل بمانند.
- **`reset_rate_limiter()`** در فایل‌کانکشن قبلاً فقط لیمیتر رزرو را پاک می‌کرد؛ تغییر داده شد تا
  تست‌های ورود هم مستقل باشند.
- خطای ۴۲۲ اعتبارسنجی برای `status` نامعتبر در فرم ثبت نوبت دستی از `Literal` می‌آید.

### ۷) چطور تست کنم

```bash
cd backend
pytest -q                      # 178 تست
ruff check . && ruff format --check .

# اجرای زندهٔ API (نیازمند PostgreSQL از docker compose)
cd ..
docker compose up -d db
cd backend && alembic upgrade head && uvicorn app.main:app --port 8000
```

---

## فاز ۱ — پایه (بعدی)

- [ ] افزودن `@tanstack/react-query` + `vitest`/`jsdom`/`@testing-library/react`
- [ ] `src/admin/AdminApp.tsx` + مسیرها + `App.tsx` (lazy)
- [ ] `auth/` (storage, AuthProvider, RequireAuth)، `api/` (client, types, hooks)
- [ ] `layout/` (AdminLayout, Sidebar، کشوی موبایل)، `components/` مشترک، `admin.css`
- [ ] `pages/LoginPage.tsx`، `DashboardPage.tsx` (پوستهٔ خالی)، `NotFoundPage.tsx`
- [ ] تست‌های `format.ts`، `client.ts`، `storage.ts`
