import re
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

MSK_TZ = timezone(timedelta(hours=3))

VALID_PLATE_LETTERS = "АВЕКМНОРСТУХABEKMHOPCTYX"
CAR_PLATE_RE = re.compile(rf"^[{VALID_PLATE_LETTERS}]\d{{3}}[{VALID_PLATE_LETTERS}]{{2}}\d{{2,3}}$")
MOTO_PLATE_RE = re.compile(rf"^\d{{4}}[{VALID_PLATE_LETTERS}]{{2}}\d{{2,3}}$")
TRAILER_PLATE_RE = re.compile(rf"^[{VALID_PLATE_LETTERS}]{{2}}\d{{4}}\d{{2,3}}$")

BOOKING_STATUS = Literal["confirmed", "completed", "no_show", "cancelled"]


def get_allowed_slots_for_date(target_date: date) -> set[str]:
    is_sunday = target_date.weekday() == 6
    start_hour = 9 if is_sunday else 8
    end_hour = 17 if is_sunday else 18

    slots = set()
    for h in range(start_hour, end_hour):
        for m in (0, 30):
            slots.add(f"{h:02d}:{m:02d}")
    return slots


def _clean_and_validate_plate(v: str) -> str:
    cleaned = re.sub(r"[^А-ЯA-Z0-9]", "", v.upper())
    if not (CAR_PLATE_RE.match(cleaned) or MOTO_PLATE_RE.match(cleaned) or TRAILER_PLATE_RE.match(cleaned)):
        raise ValueError("Укажите корректный госномер ТС (например: А 123 АА 161).")
    return cleaned


def _normalize_optional_phone(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    digits = re.sub(r"\D", "", v)
    if not digits:
        return None
    if len(digits) < 10 or len(digits) > 12:
        raise ValueError("Введите корректный номер телефона (минимум 10 цифр) или оставьте поле пустым.")
    if len(digits) == 10:
        return f"+7{digits}"
    if len(digits) == 11 and digits.startswith("8"):
        return f"+7{digits[1:]}"
    return f"+{digits}"


class LeadCreate(BaseModel):
    carNumber: str = Field(..., min_length=6, max_length=16)
    phone: str | None = Field(default=None, max_length=25)
    category: str = Field(default="M1 Легковые автомобили", max_length=64)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    consentAccepted: bool = Field(default=True)
    utmSource: str | None = Field(default=None, max_length=100)

    website: str | None = Field(default=None, max_length=100)
    formFillTimeMs: int | None = Field(default=None, ge=0)

    @field_validator("consentAccepted")
    @classmethod
    def check_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Необходимо подтвердить согласие на обработку персональных данных.")
        return v

    @field_validator("carNumber")
    @classmethod
    def validate_car_number(cls, v: str) -> str:
        return _clean_and_validate_plate(v)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        return _normalize_optional_phone(v)

    @field_validator("utmSource")
    @classmethod
    def sanitize_utm(cls, v: str | None) -> str | None:
        if not v:
            return None
        return re.sub(r"[^a-zA-Zа-яА-Я0-9_\-.]", "", v)[:100] or None

    @model_validator(mode="after")
    def validate_datetime_rules(self) -> "LeadCreate":
        try:
            target_date = date.fromisoformat(self.date)
        except ValueError as exc:
            raise ValueError("Некорректная календарная дата.") from exc

        now_msk = datetime.now(MSK_TZ)
        if target_date < now_msk.date():
            raise ValueError("Нельзя записаться на прошедшую дату.")

        allowed_slots = get_allowed_slots_for_date(target_date)
        if self.time not in allowed_slots:
            raise ValueError("Выбранное время не входит в режим работы пункта ТО.")

        if target_date == now_msk.date():
            hour, minute = map(int, self.time.split(":"))
            slot_dt = now_msk.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if slot_dt < now_msk + timedelta(minutes=15):
                raise ValueError("Выбранное время на сегодня уже прошло или слишком близко.")

        return self


class AdminManualBookingCreate(BaseModel):
    carNumber: str = Field(..., min_length=6, max_length=16)
    phone: str | None = Field(default=None, max_length=25)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    comment: str | None = Field(default=None, max_length=200)

    @field_validator("carNumber")
    @classmethod
    def validate_car_number(cls, v: str) -> str:
        return _clean_and_validate_plate(v)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        return _normalize_optional_phone(v)


class BlockedSlotCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    reason: str | None = Field(default="Технический перерыв / Линия занята", max_length=120)


class SlotsResponse(BaseModel):
    date: str
    bookedSlots: list[str]
    slotCounts: dict[str, int] = Field(default_factory=dict)
    maxPerSlot: int = 2


class LeadResponse(BaseModel):
    id: int
    status: str
    date: str
    time: str
    carNumber: str
    phone: str | None
    message: str


class AdminBookingItem(BaseModel):
    id: int
    carNumber: str
    phone: str | None
    category: str
    date: str
    time: str
    status: str
    source: str
    comment: str | None
    emailStatus: str
    maxStatus: str
    utmSource: str | None
    consentAccepted: bool
    consentTimestamp: datetime
    clientIp: str | None
    createdAt: datetime