import re
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

ALLOWED_CATEGORIES = Literal[
    "L Мотоциклы",
    "M1 Легковые автомобили",
    "N1 Грузовики (до 3,5т)",
]

MSK_TZ = timezone(timedelta(hours=3))

VALID_PLATE_LETTERS = "АВЕКМНОРСТУХABEKMHOPCTYX"
CAR_PLATE_RE = re.compile(rf"^[{VALID_PLATE_LETTERS}]\d{{3}}[{VALID_PLATE_LETTERS}]{{2}}\d{{2,3}}$")
MOTO_PLATE_RE = re.compile(rf"^\d{{4}}[{VALID_PLATE_LETTERS}]{{2}}\d{{2,3}}$")


def get_allowed_slots_for_date(target_date: date) -> set[str]:
    is_sunday = target_date.weekday() == 6
    start_hour = 9 if is_sunday else 8
    end_hour = 17 if is_sunday else 18

    slots = set()
    for h in range(start_hour, end_hour):
        for m in (0, 30):
            slots.add(f"{h:02d}:{m:02d}")
    return slots


class LeadCreate(BaseModel):
    carNumber: str | None = Field(default=None, max_length=16)
    phone: str = Field(..., min_length=10, max_length=25)
    category: ALLOWED_CATEGORIES
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    consentAccepted: bool = Field(default=False)

    # Поля защиты от спам-ботов
    website: str | None = Field(default=None, max_length=100)       # Honeypot (должно быть пустым)
    formFillTimeMs: int | None = Field(default=None, ge=0)          # Время заполнения формы в мс

    @field_validator("consentAccepted")
    @classmethod
    def check_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Необходимо дать согласие на обработку персональных данных.")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Введите корректный номер телефона (минимум 10 цифр).")
        if len(digits) == 10:
            return f"+7{digits}"
        if len(digits) == 11 and digits.startswith("8"):
            return f"+7{digits[1:]}"
        return f"+{digits}"

    @field_validator("carNumber")
    @classmethod
    def clean_car_number(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = re.sub(r"[^А-ЯA-Z0-9]", "", v.upper())
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_business_rules(self) -> "LeadCreate":
        if self.carNumber:
            if self.category == "L Мотоциклы":
                if not MOTO_PLATE_RE.match(self.carNumber):
                    raise ValueError("Неверный формат госномера мотоцикла (пример: 1234 АА 161).")
            else:
                if not CAR_PLATE_RE.match(self.carNumber):
                    raise ValueError("Неверный формат госномера (пример: А 123 АА 161).")

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


class SlotsResponse(BaseModel):
    date: str
    bookedSlots: list[str]
    slotCounts: dict[str, int] = Field(default_factory=dict)  # Сколько машин уже записано на каждый слот (0, 1 или 2)
    maxPerSlot: int = 2


class LeadResponse(BaseModel):
    id: int
    status: str
    date: str
    time: str
    category: str
    carNumber: str | None
    message: str


class AdminBookingItem(BaseModel):
    id: int
    carNumber: str | None
    phone: str
    category: str
    date: str
    time: str
    status: str
    consentAccepted: bool
    consentTimestamp: datetime
    clientIp: str | None
    createdAt: datetime