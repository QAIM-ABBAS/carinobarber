"""Tests for the phone number normalization."""

from __future__ import annotations

import pytest

from app.core.phone import InvalidPhoneError, mask_phone, normalize_phone


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("09121234567", "09121234567"),
        ("۰۹۱۲۱۲۳۴۵۶۷", "09121234567"),
        ("٠٩١٢١٢٣٤٥٦٧", "09121234567"),
        ("+989121234567", "09121234567"),
        ("+98 912 123 4567", "09121234567"),
        ("00989121234567", "09121234567"),
        ("0098 912 123 4567", "09121234567"),
        ("98 912 123 4567", "09121234567"),
        ("989121234567", "09121234567"),
        ("0912 123 4567", "09121234567"),
        ("0912-123-4567", "09121234567"),
        ("0912(123)4567", "09121234567"),
        ("  09121234567  ", "09121234567"),
        ("9121234567", "09121234567"),
    ],
)
def test_normalize_phone_accepts_valid_numbers(raw: str, expected: str) -> None:
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "12345",
        "0812345678",
        "0912345678",
        "0912123456789",
        "091212345678",
        "abcdefghijk",
        "0912123456a",
        "+98 912 123 456",
        "0098912345678",
        "۰۹۱۲۱۲۳۴۵",
    ],
)
def test_normalize_phone_rejects_invalid_numbers(raw: str) -> None:
    with pytest.raises(InvalidPhoneError):
        normalize_phone(raw)


def test_normalize_phone_rejects_non_string_values() -> None:
    with pytest.raises(InvalidPhoneError):
        normalize_phone(9121234567)  # type: ignore[arg-type]


def test_mask_phone_hides_the_middle_digits() -> None:
    assert mask_phone("09121234567") == "0912***4567"


def test_mask_phone_handles_short_values() -> None:
    assert mask_phone("1234") == "***"
