from datetime import date, datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Booking
from app.notifications import notify_new_booking
from app.schemas import LeadCreate, LeadResponse, SlotsResponse

router = APIRouter(prefix="/api", tags=["Bookings"])


def _extract_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()[:64]
    return request.client.host[:64] if request.client else None


@router.get("/slots", response_model=SlotsResponse)
async def get_booked_slots(
    date_str: str = Query(..., alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
) -> SlotsResponse:
    try:
        date.fromisoformat(date_str)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Некорректный формат даты.") from exc

    stmt = (
        select(Booking.booking_time, func.count(Booking.id))
        .where(Booking.booking_date == date_str, Booking.status == "confirmed")
        .group_by(Booking.booking_time)
    )
    result = await db.execute(stmt)
    counts = {row[0]: int(row[1]) for row in result.all()}

    # Слот считается полностью занятым для фронтенда, только когда набралось max_bookings_per_slot (2 человека)
    fully_booked = sorted([t for t, cnt in counts.items() if cnt >= settings.max_bookings_per_slot])

    return SlotsResponse(
        date=date_str,
        bookedSlots=fully_booked,
        slotCounts=counts,
        maxPerSlot=settings.max_bookings_per_slot,
    )


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> LeadResponse:
    # 1. Тихая отсечка ботов по honeypot-полю и скорости заполнения (< 1.5 сек)
    if (payload.website and payload.website.strip()) or (
        payload.formFillTimeMs is not None and payload.formFillTimeMs < 1500
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ошибка проверки безопасности формы.")

    # 2. Блокировка на уровне транзакции БД (защита от одновременного клика 3-го человека)
    if settings.database_url.startswith("sqlite"):
        await db.execute(text("BEGIN IMMEDIATE"))

    # 3. Защита от спама с одного номера телефона (максимум 2 активные записи на один день)
    phone_count_stmt = select(func.count(Booking.id)).where(
        Booking.booking_date == payload.date,
        Booking.phone == payload.phone,
        Booking.status == "confirmed",
    )
    phone_bookings_today = (await db.execute(phone_count_stmt)).scalar_one()
    if phone_bookings_today >= 2:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="На этот номер телефона уже оформлено максимальное количество записей на выбранный день.",
        )

    # 4. Проверяем, сколько человек уже записано на это окно (разрешаем до 2 человек)
    slot_count_stmt = select(func.count(Booking.id)).where(
        Booking.booking_date == payload.date,
        Booking.booking_time == payload.time,
        Booking.status == "confirmed",
    )
    current_count = (await db.execute(slot_count_stmt)).scalar_one()

    if current_count >= settings.max_bookings_per_slot:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="На это время уже записаны 2 автомобиля. Пожалуйста, выберите другой слот.",
        )

    now_utc = datetime.now(timezone.utc)
    new_booking = Booking(
        car_number=payload.carNumber,
        phone=payload.phone,
        category=payload.category,
        booking_date=payload.date,
        booking_time=payload.time,
        status="confirmed",
        consent_accepted=payload.consentAccepted,
        consent_timestamp=now_utc,
        client_ip=_extract_client_ip(request),
        created_at=now_utc,
    )

    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)

    background_tasks.add_task(
        notify_new_booking,
        booking_id=new_booking.id,
        booking_date=new_booking.booking_date,
        booking_time=new_booking.booking_time,
        category=new_booking.category,
        phone=new_booking.phone,
        car_number=new_booking.car_number,
        slot_occupancy=current_count + 1,
    )

    return LeadResponse(
        id=new_booking.id,
        status=new_booking.status,
        date=new_booking.booking_date,
        time=new_booking.booking_time,
        category=new_booking.category,
        carNumber=new_booking.car_number,
        message="Заявка успешно создана",
    )