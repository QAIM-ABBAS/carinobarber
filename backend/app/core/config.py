"""Application settings, loaded from environment variables and the .env file."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent

DEFAULT_SECRET_KEY = "change-me-to-a-long-random-string"
DEFAULT_ADMIN_PASSWORD = "change-me-now"
MIN_SECRET_KEY_LENGTH = 32
SUPPORTED_SMS_PROVIDERS = ("console",)


class Settings(BaseSettings):
    """Runtime configuration. Every value can be overridden through the environment."""

    model_config = SettingsConfigDict(
        # The repository root holds the shared configuration, the backend folder may
        # override it locally. The last file wins.
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://gc:gc@db:5432/gentlemans_club"
    secret_key: str = DEFAULT_SECRET_KEY
    access_token_expire_minutes: int = 720
    admin_username: str = "admin"
    admin_password: str = DEFAULT_ADMIN_PASSWORD
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    shop_timezone: str = "Asia/Tehran"
    seed_on_start: bool = True
    sms_provider: str = "console"
    rate_limit_bookings_per_minute: int = 5
    upload_dir: Path = BACKEND_DIR / "uploads"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        """Allow a comma separated list in the environment (CORS_ORIGINS=a,b)."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, (list, tuple)):
            return [str(item).strip() for item in value if str(item).strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def shop_tz(self) -> ZoneInfo:
        return ZoneInfo(self.shop_timezone)

    def validate_or_raise(self) -> None:
        """Fail fast when the configuration is unusable or insecure.

        Raises:
            RuntimeError: when the environment is invalid, or when production is
                running with default/weak secrets.
        """
        try:
            ZoneInfo(self.shop_timezone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise RuntimeError(f"Invalid SHOP_TIMEZONE: {self.shop_timezone!r}") from exc

        if self.sms_provider not in SUPPORTED_SMS_PROVIDERS:
            raise RuntimeError(
                f"Unsupported SMS_PROVIDER: {self.sms_provider!r}. "
                f"Supported providers: {', '.join(SUPPORTED_SMS_PROVIDERS)}"
            )

        if self.access_token_expire_minutes <= 0:
            raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive number")

        if self.rate_limit_bookings_per_minute <= 0:
            raise RuntimeError("RATE_LIMIT_BOOKINGS_PER_MINUTE must be a positive number")

        if not self.is_production:
            return

        problems: list[str] = []
        if self.secret_key == DEFAULT_SECRET_KEY or len(self.secret_key) < MIN_SECRET_KEY_LENGTH:
            problems.append(
                "SECRET_KEY must be replaced with a random string of at least "
                f"{MIN_SECRET_KEY_LENGTH} characters"
            )
        if self.admin_password == DEFAULT_ADMIN_PASSWORD:
            problems.append("ADMIN_PASSWORD must be replaced")
        if problems:
            raise RuntimeError("Insecure production configuration: " + "; ".join(problems))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached settings singleton."""
    return Settings()
