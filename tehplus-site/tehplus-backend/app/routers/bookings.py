import hashlib
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import BlockedSlot, Booking, SystemLog
from app.notifications import notify_new_booking
from app.schemas import LeadCreate, LeadResponse, SlotsResponse

router = APIRouter(prefix="/api", tags=["Bookings"])

# Активные статусы, которые занимают место на линии
OCCUPYING_STATUSES = ("confirmed", "completed", "no_show")


def _extract_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()[:64]
    return request.client.host[:64] if request.client else None
TRUSTED_PROXIES = {"127.0.0.1", "::1"}

def _get_real_client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else "unknown"
    if direct_ip in TRUSTED_PROXIES:
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()[:64]
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Берём последний IP в цепочке, добавленный нашим Nginx
            return forwarded.split(",")[-1].strip()[:64]
    return direct_ip[:64]


@router.get("/slots", response_model=SlotsResponse)
async def get_booked_slots(
    date_str: str = Query(..., alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
) -> SlotsResponse:
    try:
        date.fromisoformat(date_str)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Некорректный формат даты.") from exc

    # 1. Считаем занятые места по активным записям
    stmt = (
        select(Booking.booking_time, func.count(Booking.id))
        .where(Booking.booking_date == date_str, Booking.status.in_(OCCUPYING_STATUSES))
        .group_by(Booking.booking_time)
    )
    result = await db.execute(stmt)
    counts = {row[0]: int(row[1]) for row in result.all()}

    # 2. Получаем слоты, вручную закрытые администратором (обед, поверка, спецзаказ)
    blocked_stmt = select(BlockedSlot.block_time).where(BlockedSlot.block_date == date_str)
    blocked_times = set((await db.execute(blocked_stmt)).scalars().all())

    fully_booked_set = {t for t, cnt in counts.items() if cnt >= settings.max_bookings_per_slot}
    fully_booked_set.update(blocked_times)

    return SlotsResponse(
        date=date_str,
        bookedSlots=sorted(fully_booked_set),
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
    client_ip = _extract_client_ip(request)

    # 1. Проверка Origin запроса (отсекает сторонние сайты и прямые запросы с чужих доменов)
    origin = request.headers.get("Origin")
    if origin and origin not in settings.cors_origins_list:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недопустимый источник запроса.")

    # 2. Антибот-фильтр (Honeypot + скорость заполнения) — до обращения к БД
    if (payload.website and payload.website.strip()) or (
        payload.formFillTimeMs is not None and payload.formFillTimeMs < 1500
    ):
        reason = "Honeypot заполнен" if payload.website else f"Слишком быстрая отправка ({payload.formFillTimeMs} мс)"
        db.add(
            SystemLog(
                level="SECURITY",
                source="security",
                message="Заблокирована спам-попытка отправки формы",
                details=reason,
                url_path="/api/leads",
                client_ip=client_ip,
            )
        )
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ошибка проверки безопасности формы.")

    # 3. Не более 3 активных записей за сутки с одного IP-адреса
    if client_ip and client_ip != "unknown":
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        ip_daily_stmt = select(func.count(Booking.id)).where(
            Booking.client_ip == client_ip,
            Booking.created_at >= since_24h,
            Booking.status.in_(OCCUPYING_STATUSES),
        )
        if (await db.execute(ip_daily_stmt)).scalar_one() >= 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Превышен суточный лимит записей с вашего устройства.",
            )
    # 2. Атомарная блокировка слота
    if settings.database_url.startswith("sqlite"):
        await db.execute(text("BEGIN IMMEDIATE"))
    elif settings.database_url.startswith("postgresql"):
        lock_key = int.from_bytes(
            hashlib.sha256(f"{payload.date}:{payload.time}".encode()).digest()[:8],
            "big",
            signed=True,
        )
        await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})

    # 3. Проверка, не закрыт ли слот администратором
    is_blocked = (
        await db.execute(
            select(BlockedSlot.id).where(
                BlockedSlot.block_date == payload.date,
                BlockedSlot.block_time == payload.time,
            )
        )
    ).scalar_one_or_none()
    if is_blocked is not None:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Выбранное время недоступно для записи. Пожалуйста, выберите другой слот.",
        )

    # 4. Лимит на один госномер (макс. 2 записи в день)
    car_count_stmt = select(func.count(Booking.id)).where(
        Booking.booking_date == payload.date,
        Booking.car_number == payload.carNumber,
        Booking.status.in_(OCCUPYING_STATUSES),
    )
    if (await db.execute(car_count_stmt)).scalar_one() >= 2:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="На этот автомобиль уже оформлено максимальное количество записей на выбранный день.",
        )

    # 5. Лимит на один телефон (если указан)
    if payload.phone:
        phone_count_stmt = select(func.count(Booking.id)).where(
            Booking.booking_date == payload.date,
            Booking.phone == payload.phone,
            Booking.status.in_(OCCUPYING_STATUSES),
        )
        if (await db.execute(phone_count_stmt)).scalar_one() >= 2:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="На этот номер телефона уже оформлено максимальное количество записей на выбранный день.",
            )

    # 6. Проверка вместимости слота (до 2 автомобилей)
    slot_count_stmt = select(func.count(Booking.id)).where(
        Booking.booking_date == payload.date,
        Booking.booking_time == payload.time,
        Booking.status.in_(OCCUPYING_STATUSES),
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
        source="online",
        utm_source=payload.utmSource,
        consent_accepted=payload.consentAccepted,
        consent_timestamp=now_utc,
        client_ip=client_ip,
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
        car_number=new_booking.car_number,
        phone=new_booking.phone,
        slot_occupancy=current_count + 1,
        source="online",
    )

    return LeadResponse(
        id=new_booking.id,
        status=new_booking.status,
        date=new_booking.booking_date,
        time=new_booking.booking_time,
        carNumber=new_booking.car_number,
        phone=new_booking.phone,
        message="Заявка успешно создана",
    )