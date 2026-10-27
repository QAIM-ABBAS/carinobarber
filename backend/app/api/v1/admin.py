"""Admin HTTP routes. Every route except the login needs a bearer token."""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from pathlib import Path as MediaPath

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Path,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_customer
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.rate_limit import rate_limit_login
from app.core.security import (
    build_admin_credentials,
    create_access_token,
    is_admin_phone,
    verify_admin_login,
)
from app.core.timeutil import get_now
from app.db.session import get_db
from app.models.booking import BookingStatus
from app.models.user import User
from app.schemas.admin import (
    AdminBookingCreate,
    AdminBookingItem,
    AdminBookingList,
    AdminBookingUpdate,
    AdminLogin,
    ClosedDateCreate,
    ClosedDateOut,
    ServiceAdminOut,
    ServiceCreate,
    ServiceUpdate,
    ShopSettingsOut,
    ShopSettingsUpdate,
    StatsSummary,
    TokenOut,
)
from app.schemas.common import ERROR_RESPONSES
from app.services import admin as admin_service
from app.services import media
from app.services.admin import BookingFilters
from app.services.availability import get_shop_settings
from app.services.sms import build_booking_created_message, send_sms_safely

admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={401: ERROR_RESPONSES[401]},
)

#: The generated file name of an uploaded service image (see ``app.services.media``).
IMAGE_FILENAME_PATTERN = r"^[a-f0-9]{32}\.(?:jpg|png|webp)$"


def _settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", None) or get_settings()


@admin_router.post(
    "/login",
    response_model=TokenOut,
    summary="ورود مدیر",
    responses={
        401: {"model": None, "description": "اطلاعات ورود نادرست"},
        429: ERROR_RESPONSES[429],
    },
)
def login(
    payload: AdminLogin,
    request: Request,
    _rate_limit: None = Depends(rate_limit_login),
) -> TokenOut:
    """Exchange the admin credentials for an access token.

    The endpoint is rate limited: five attempts per minute and per client IP.
    """
    credentials = getattr(request.app.state, "admin_credentials", None)
    if credentials is None:
        credentials = build_admin_credentials()

    if not verify_admin_login(credentials, payload.username, payload.password):
        raise AppError(
            code="invalid_credentials",
            message="نام کاربری یا رمز عبور نادرست است.",
            status_code=401,
        )

    token, expires_in = create_access_token(credentials.username)
    return TokenOut(access_token=token, token_type="bearer", expires_in=expires_in)


@admin_router.post(
    "/session",
    response_model=TokenOut,
    summary="ورود مدیر از حساب کاربری",
    responses={403: ERROR_RESPONSES[403]},
)
def login_with_customer_account(
    request: Request,
    user: User = Depends(get_current_customer),
) -> TokenOut:
    """Exchange a verified customer session for an admin token.

    The phone comes from the customer token and its account, never from the request
    body, and it is compared with ``ADMIN_PHONE`` on the server. A customer whose
    phone does not belong to the admin gets a 403 and no token.
    """
    settings = _settings(request)
    if not is_admin_phone(user.phone, settings):
        raise AppError(
            code="forbidden",
            message="این حساب کاربری به پنل مدیریت دسترسی ندارد.",
            status_code=403,
        )

    credentials = getattr(request.app.state, "admin_credentials", None)
    if credentials is None:
        credentials = build_admin_credentials(settings)

    token, expires_in = create_access_token(credentials.username)
    return TokenOut(access_token=token, token_type="bearer", expires_in=expires_in)


@admin_router.get("/services", response_model=list[ServiceAdminOut], summary="همهٔ خدمات")
def admin_list_services(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> list[ServiceAdminOut]:
    """Return every service, including the inactive ones."""
    return [ServiceAdminOut.model_validate(service) for service in admin_service.list_services(db)]


@admin_router.post(
    "/services",
    response_model=ServiceAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="افزودن خدمت",
    responses={409: ERROR_RESPONSES[409]},
)
def admin_create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ServiceAdminOut:
    """Create a new service."""
    return ServiceAdminOut.model_validate(admin_service.create_service(db, payload))


@admin_router.patch(
    "/services/{service_id}",
    response_model=ServiceAdminOut,
    summary="ویرایش خدمت",
    responses={404: ERROR_RESPONSES[404]},
)
def admin_update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ServiceAdminOut:
    """Apply a partial update on a service."""
    return ServiceAdminOut.model_validate(admin_service.update_service(db, service_id, payload))


@admin_router.delete(
    "/services/{service_id}",
    response_model=ServiceAdminOut,
    summary="حذف خدمت",
    responses={404: ERROR_RESPONSES[404]},
)
def admin_delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ServiceAdminOut:
    """Deactivate a service (soft delete)."""
    return ServiceAdminOut.model_validate(admin_service.deactivate_service(db, service_id))


@admin_router.post(
    "/services/{service_id}/images",
    response_model=ServiceAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="افزودن تصویر خدمت",
    responses={400: ERROR_RESPONSES[400], 404: ERROR_RESPONSES[404]},
)
async def admin_upload_service_image(
    request: Request,
    service_id: int,
    file: UploadFile = File(description="تصویر JPEG، PNG یا WebP (حداکثر ۵ مگابایت)"),
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ServiceAdminOut:
    """Upload one image and append it to the gallery of the service."""
    upload_dir = MediaPath(request.app.state.settings.upload_dir)

    # Fail with 404 before reading or writing the file.
    admin_service.get_service(db, service_id)

    content = await file.read(media.MAX_IMAGE_BYTES + 1)
    if not content:
        raise AppError(
            code="invalid_image",
            message="فایل تصویر خالی است.",
            status_code=400,
        )
    if len(content) > media.MAX_IMAGE_BYTES:
        raise AppError(
            code="image_too_large",
            message="حجم تصویر نباید بیشتر از ۵ مگابایت باشد.",
            status_code=400,
        )

    extension = media.detect_image_extension(content)
    if extension is None:
        raise AppError(
            code="invalid_image",
            message="فقط تصویر JPEG، PNG یا WebP مجاز است.",
            status_code=400,
        )

    image_url = media.save_service_image(upload_dir, content, extension)
    try:
        service = admin_service.add_service_image(db, service_id, image_url)
    except Exception:
        # Do not leave an orphan file behind when the database rejects the image.
        media.delete_service_image_file(upload_dir, image_url)
        raise
    return ServiceAdminOut.model_validate(service)


@admin_router.delete(
    "/services/{service_id}/images/{filename}",
    response_model=ServiceAdminOut,
    summary="حذف تصویر خدمت",
    responses={404: ERROR_RESPONSES[404]},
)
def admin_delete_service_image(
    request: Request,
    service_id: int,
    filename: str = Path(pattern=IMAGE_FILENAME_PATTERN, description="نام فایل تصویر"),
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ServiceAdminOut:
    """Remove one image of the service and delete the file from disk."""
    service, image_url = admin_service.remove_service_image(db, service_id, filename)
    media.delete_service_image_file(MediaPath(request.app.state.settings.upload_dir), image_url)
    return ServiceAdminOut.model_validate(service)


@admin_router.get(
    "/bookings",
    response_model=AdminBookingList,
    summary="فهرست نوبت‌ها",
)
def admin_list_bookings(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
    date: Date | None = Query(default=None, description="یک روز مشخص"),
    date_from: Date | None = Query(default=None, description="از تاریخ"),
    date_to: Date | None = Query(default=None, description="تا تاریخ"),
    status_filter: BookingStatus | None = Query(
        default=None, alias="status", description="وضعیت نوبت"
    ),
    q: str | None = Query(default=None, max_length=100, description="جست‌وجوی نام، موبایل یا کد"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminBookingList:
    """Return a filtered and paginated list of bookings."""
    filters = BookingFilters(
        date=date,
        date_from=date_from,
        date_to=date_to,
        status=status_filter.value if status_filter is not None else None,
        q=q,
    )
    bookings, total = admin_service.list_bookings(db, filters, page, page_size)
    return AdminBookingList(
        items=[
            AdminBookingItem.model_validate(admin_service.to_booking_item(booking))
            for booking in bookings
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@admin_router.post(
    "/bookings",
    response_model=AdminBookingItem,
    status_code=status.HTTP_201_CREATED,
    summary="ثبت نوبت دستی",
    responses={
        404: ERROR_RESPONSES[404],
        409: ERROR_RESPONSES[409],
        422: ERROR_RESPONSES[422],
    },
)
def admin_create_booking(
    payload: AdminBookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
    _admin: str = Depends(get_current_admin),
) -> AdminBookingItem:
    """Create a booking by hand (phone booking or walk-in).

    The endpoint is not rate limited and it lifts the per phone number limit of
    active bookings, but every other rule of the public booking endpoint still
    applies. A confirmed booking sends the confirmation SMS, a pending one does not.
    """
    booking = admin_service.create_admin_booking(db, payload, now)
    if payload.status == BookingStatus.CONFIRMED.value:
        background_tasks.add_task(
            send_sms_safely,
            booking.phone,
            build_booking_created_message(booking.code, booking.date.isoformat(), booking.time),
        )
    return AdminBookingItem.model_validate(admin_service.to_booking_item(booking))


@admin_router.get(
    "/bookings/{booking_id}",
    response_model=AdminBookingItem,
    summary="نوبت",
    responses={404: ERROR_RESPONSES[404]},
)
def admin_get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> AdminBookingItem:
    """Return a single booking."""
    booking = admin_service.get_booking(db, booking_id)
    return AdminBookingItem.model_validate(admin_service.to_booking_item(booking))


@admin_router.patch(
    "/bookings/{booking_id}",
    response_model=AdminBookingItem,
    summary="ویرایش نوبت",
    responses={404: ERROR_RESPONSES[404], 409: ERROR_RESPONSES[409]},
)
def admin_update_booking(
    booking_id: int,
    payload: AdminBookingUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> AdminBookingItem:
    """Change the status and/or the admin note of a booking."""
    booking = admin_service.update_booking(db, booking_id, payload)
    return AdminBookingItem.model_validate(admin_service.to_booking_item(booking))


@admin_router.get("/settings", response_model=ShopSettingsOut, summary="تنظیمات باشگاه")
def admin_get_settings(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ShopSettingsOut:
    """Return the shop settings."""
    return ShopSettingsOut.model_validate(get_shop_settings(db))


@admin_router.put(
    "/settings",
    response_model=ShopSettingsOut,
    summary="ویرایش تنظیمات باشگاه",
    responses={422: ERROR_RESPONSES[422]},
)
def admin_update_settings(
    payload: ShopSettingsUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ShopSettingsOut:
    """Update the shop settings."""
    settings = admin_service.update_shop_settings(db, payload)
    return ShopSettingsOut.model_validate(settings)


@admin_router.get(
    "/closed-dates",
    response_model=list[ClosedDateOut],
    summary="فهرست تعطیلات",
)
def admin_list_closed_dates(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> list[ClosedDateOut]:
    """Return every holiday."""
    return [
        ClosedDateOut.model_validate(closed_date)
        for closed_date in admin_service.list_closed_dates(db)
    ]


@admin_router.post(
    "/closed-dates",
    response_model=ClosedDateOut,
    status_code=status.HTTP_201_CREATED,
    summary="افزودن تعطیلی",
    responses={409: ERROR_RESPONSES[409]},
)
def admin_create_closed_date(
    payload: ClosedDateCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> ClosedDateOut:
    """Add a holiday."""
    return ClosedDateOut.model_validate(admin_service.create_closed_date(db, payload))


@admin_router.delete(
    "/closed-dates/{closed_date_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="حذف تعطیلی",
    responses={404: ERROR_RESPONSES[404]},
)
def admin_delete_closed_date(
    closed_date_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> Response:
    """Remove a holiday."""
    admin_service.delete_closed_date(db, closed_date_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get(
    "/stats/summary",
    response_model=StatsSummary,
    summary="آمار داشبورد",
)
def admin_stats_summary(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
    now: datetime = Depends(get_now),
) -> StatsSummary:
    """Return the numbers of the dashboard."""
    return admin_service.get_stats_summary(db, now)
