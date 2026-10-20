"""Normalization of Iranian mobile phone numbers."""

from __future__ import annotations

import re

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
ASCII_DIGITS = "0123456789"

_DIGIT_TRANSLATION = str.maketrans(PERSIAN_DIGITS + ARABIC_DIGITS, ASCII_DIGITS * 2)
# Spaces, dashes, parentheses, the plus sign and invisible direction marks.
_NOISE_PATTERN = re.compile(r"[\s\-+()\u200c\u200e\u200f]")

_LOCAL_PATTERN = re.compile(r"^09\d{9}$")
_BARE_PATTERN = re.compile(r"^9\d{9}$")
_COUNTRY_PATTERN = re.compile(r"^98(9\d{9})$")
_INTERNATIONAL_PATTERN = re.compile(r"^0098(9\d{9})$")


class InvalidPhoneError(ValueError):
    """Raised when a phone number cannot be normalized."""

    def __init__(self, message: str = "شماره موبایل معتبر نیست.") -> None:
        super().__init__(message)
        self.message = message


def normalize_phone(value: str) -> str:
    """Normalize an Iranian mobile number to the ``09xxxxxxxxx`` form.

    Persian and Arabic-Indic digits are converted to ASCII, separators are removed and
    the ``0098`` / ``98`` / ``0`` country prefixes are accepted.

    Args:
        value: the raw phone number.

    Returns:
        The normalized 11 digit phone number.

    Raises:
        InvalidPhoneError: when the number is not a valid Iranian mobile number.
    """
    if not isinstance(value, str):
        raise InvalidPhoneError()

    cleaned = _NOISE_PATTERN.sub("", value.translate(_DIGIT_TRANSLATION))

    if _LOCAL_PATTERN.match(cleaned):
        return cleaned
    if _BARE_PATTERN.match(cleaned):
        return f"0{cleaned}"
    country = _COUNTRY_PATTERN.match(cleaned)
    if country:
        return f"0{country.group(1)}"
    international = _INTERNATIONAL_PATTERN.match(cleaned)
    if international:
        return f"0{international.group(1)}"
    raise InvalidPhoneError()


def mask_phone(phone: str) -> str:
    """Mask a phone number for log messages (``0912***4567``)."""
    if len(phone) <= 8:
        return "***"
    return f"{phone[:4]}***{phone[-4:]}"
