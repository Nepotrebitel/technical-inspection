import secrets
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Booking
from app.schemas import AdminBookingItem
from datetime import date, timedelta
from sqlalchemy import case, func, select
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Booking
from app.routers.admin import verify_admin_key

router = APIRouter(prefix="/api/admin", tags=["Admin"])

_failed_admin_attempts: dict[str, list[float]] = defaultdict(list)
ADMIN_MAX_FAILS = 5
ADMIN_BAN_SECONDS = 900  # 15 минут


def verify_admin_key(request: Request, x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    fails = [t for t in _failed_admin_attempts[ip] if now - t < ADMIN_BAN_SECONDS]
    _failed_admin_attempts[ip] = fails

    if len(fails) >= ADMIN_MAX_FAILS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много неверных попыток входа. Доступ временно заблокирован на 15 минут.",
        )

    if not secrets.compare_digest(x_admin_key, settings.admin_api_key):
        _failed_admin_attempts[ip].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный ключ доступа администратора.",
        )

    _failed_admin_attempts.pop(ip, None)


@router.get("/bookings", response_model=list[AdminBookingItem], dependencies=[Depends(verify_admin_key)])
async def list_bookings(
    date_str: str | None = Query(default=None, alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
) -> list[AdminBookingItem]:
    stmt = select(Booking).order_by(Booking.booking_date.desc(), Booking.booking_time.asc())
    if date_str:
        stmt = stmt.where(Booking.booking_date == date_str)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        AdminBookingItem(
            id=b.id,
            carNumber=b.car_number,
            phone=b.phone,
            category=b.category,
            date=b.booking_date,
            time=b.booking_time,
            status=b.status,
            consentAccepted=b.consent_accepted,
            consentTimestamp=b.consent_timestamp,
            clientIp=b.client_ip,
            createdAt=b.created_at,
        )
        for b in rows
    ]


@router.patch("/bookings/{booking_id}/cancel", dependencies=[Depends(verify_admin_key)])
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена.")

    booking.status = "cancelled"
    await db.commit()
    return {"id": booking.id, "status": booking.status, "message": "Запись отменена, место в слоте освобождено."}


@router.delete("/bookings/{booking_id}", dependencies=[Depends(verify_admin_key)])
async def delete_booking_pdn(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена.")

    await db.delete(booking)
    await db.commit()
    return {"id": booking_id, "message": "Персональные данные и запись безвозвратно удалены."}

# Добавьте этот роут в существующий router в app/routers/admin.py
@router.get("/analytics", dependencies=[Depends(verify_admin_key)])
async def get_business_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Сводная бизнес-аналитика по записям из БД (хранится в РФ)."""
    since_date = (date.today() - timedelta(days=days)).isoformat()

    # 1. Общая статистика статусов и заполнения госномера
    summary_stmt = select(
        func.count(Booking.id).label("total"),
        func.sum(case((Booking.status == "confirmed", 1), else_=0)).label("confirmed"),
        func.sum(case((Booking.status == "cancelled", 1), else_=0)).label("cancelled"),
        func.sum(case((Booking.car_number.is_not(None), 1), else_=0)).label("with_plate"),
    ).where(Booking.booking_date >= since_date)

    summary = (await db.execute(summary_stmt)).one()

    # 2. Разбивка по категориям ТС
    cat_stmt = (
        select(Booking.category, func.count(Booking.id))
        .where(Booking.booking_date >= since_date, Booking.status == "confirmed")
        .group_by(Booking.category)
    )
    by_category = {row[0]: int(row[1]) for row in (await db.execute(cat_stmt)).all()}

    # 3. Пиковые часы загрузки линии
    hours_stmt = (
        select(Booking.booking_time, func.count(Booking.id))
        .where(Booking.booking_date >= since_date, Booking.status == "confirmed")
        .group_by(Booking.booking_time)
        .order_by(func.count(Booking.id).desc())
    )
    by_time = {row[0]: int(row[1]) for row in (await db.execute(hours_stmt)).all()}

    # 4. Динамика по дням
    daily_stmt = (
        select(Booking.booking_date, func.count(Booking.id))
        .where(Booking.booking_date >= since_date, Booking.status == "confirmed")
        .group_by(Booking.booking_date)
        .order_by(Booking.booking_date.asc())
    )
    by_day = [{"date": row[0], "count": int(row[1])} for row in (await db.execute(daily_stmt)).all()]

    return {
        "periodDays": days,
        "sinceDate": since_date,
        "summary": {
            "total": int(summary.total or 0),
            "confirmed": int(summary.confirmed or 0),
            "cancelled": int(summary.cancelled or 0),
            "withCarNumber": int(summary.with_plate or 0),
        },
        "byCategory": by_category,
        "peakHours": by_time,
        "dailyTrend": by_day,
    }