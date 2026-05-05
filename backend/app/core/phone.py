import uuid

from sqlalchemy.orm import Session

from app.models.user import User


IVORY_COAST_COUNTRY_CODE = "225"


def _digits_only(value: str) -> str:
    return "".join(character for character in value if character.isdigit())


def normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None

    digits = _digits_only(value.strip())
    if not digits:
        return None

    local_number = digits
    if digits.startswith(IVORY_COAST_COUNTRY_CODE):
        local_number = digits[len(IVORY_COAST_COUNTRY_CODE) :]

    return f"+{IVORY_COAST_COUNTRY_CODE}{local_number}"


def phone_variants(value: str | None) -> list[str]:
    normalized = normalize_phone(value)
    if not normalized:
        return []

    digits = _digits_only(normalized)
    local_number = digits[len(IVORY_COAST_COUNTRY_CODE) :]

    candidates = [
        normalized,
        digits,
        local_number,
        f"{IVORY_COAST_COUNTRY_CODE}{local_number}",
    ]

    ordered: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in ordered:
            ordered.append(candidate)
    return ordered


def matches_phone(value: str | None, expected: str | None) -> bool:
    normalized_expected = normalize_phone(expected)
    normalized_value = normalize_phone(value)
    return bool(normalized_expected and normalized_value and normalized_expected == normalized_value)


def find_user_by_phone(
    db: Session,
    phone: str | None,
    *,
    exclude_user_id: uuid.UUID | None = None,
) -> User | None:
    normalized = normalize_phone(phone)
    if not normalized:
        return None

    query = db.query(User).filter(User.phone.isnot(None))
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)

    direct_match = query.filter(User.phone.in_(phone_variants(normalized))).first()
    if direct_match:
        return direct_match

    for user in query.all():
        if matches_phone(user.phone, normalized):
            return user

    return None
