import csv
import io
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import BlockedSlot, Booking, SystemLog
from app.notifications import notify_new_booking, send_test_notifications
from app.schemas import AdminBookingItem, AdminManualBookingCreate, BOOKING_STATUS, BlockedSlotCreate

router = APIRouter(prefix="/api/admin", tags=["Admin"])

_failed_admin_attempts: dict[str, list[float]] = defaultdict(list)
ADMIN_MAX_FAILS = 5
ADMIN_BAN_SECONDS = 900


def verify_admin_key(request: Request, x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    fails = [t for t in _failed_admin_attempts[ip] if now - t < ADMIN_BAN_SECONDS]
    _failed_admin_attempts[ip] = fails

    if len(fails) >= ADMIN_MAX_FAILS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много неверных попыток входа. Доступ заблокирован на 15 минут.",
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
    search: str | None = Query(default=None, max_length=30),
    db: AsyncSession = Depends(get_db),
) -> list[AdminBookingItem]:
    stmt = select(Booking).order_by(Booking.booking_date.desc(), Booking.booking_time.asc())
    if date_str:
        stmt = stmt.where(Booking.booking_date == date_str)
    if search and search.strip():
        q = f"%{search.strip().upper()}%"
        stmt = stmt.where((Booking.car_number.ilike(q)) | (Booking.phone.ilike(q)))

    rows = (await db.execute(stmt)).scalars().all()

    return [
        AdminBookingItem(
            id=b.id,
            carNumber=b.car_number,
            phone=b.phone,
            category=b.category,
            date=b.booking_date,
            time=b.booking_time,
            status=b.status,
            source=b.source,
            comment=b.comment,
            emailStatus=b.email_status,
            maxStatus=b.max_status,
            utmSource=b.utm_source,
            consentAccepted=b.consent_accepted,
            consentTimestamp=b.consent_timestamp,
            clientIp=b.client_ip,
            createdAt=b.created_at,
        )
        for b in rows
    ]


@router.post("/bookings/manual", response_model=AdminBookingItem, dependencies=[Depends(verify_admin_key)])
async def create_manual_booking(
    payload: AdminManualBookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AdminBookingItem:
    """Ручная запись клиента диспетчером (по звонку или из живой очереди)."""
    slot_count_stmt = select(func.count(Booking.id)).where(
        Booking.booking_date == payload.date,
        Booking.booking_time == payload.time,
        Booking.status.in_(("confirmed", "completed", "no_show")),
    )
    current_count = (await db.execute(slot_count_stmt)).scalar_one()

    if current_count >= settings.max_bookings_per_slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="На это время уже записаны 2 автомобиля.",
        )

    now_utc = datetime.now(timezone.utc)
    booking = Booking(
        car_number=payload.carNumber,
        phone=payload.phone,
        category="M1 Легковые автомобили",
        booking_date=payload.date,
        booking_time=payload.time,
        status="confirmed",
        source="manual",
        comment=payload.comment,
        consent_accepted=True,
        consent_timestamp=now_utc,
        client_ip="admin-manual",
        created_at=now_utc,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    background_tasks.add_task(
        notify_new_booking,
        booking_id=booking.id,
        booking_date=booking.booking_date,
        booking_time=booking.booking_time,
        car_number=booking.car_number,
        phone=booking.phone,
        slot_occupancy=current_count + 1,
        source="manual",
    )

    return AdminBookingItem(
        id=booking.id,
        carNumber=booking.car_number,
        phone=booking.phone,
        category=booking.category,
        date=booking.booking_date,
        time=booking.booking_time,
        status=booking.status,
        source=booking.source,
        comment=booking.comment,
        emailStatus=booking.email_status,
        maxStatus=booking.max_status,
        utmSource=booking.utm_source,
        consentAccepted=booking.consent_accepted,
        consentTimestamp=booking.consent_timestamp,
        clientIp=booking.client_ip,
        createdAt=booking.created_at,
    )


@router.patch("/bookings/{booking_id}/status", dependencies=[Depends(verify_admin_key)])
async def update_booking_status(
    booking_id: int,
    new_status: BOOKING_STATUS = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена.")

    booking.status = new_status
    await db.commit()
    return {"id": booking.id, "status": booking.status}


@router.delete("/bookings/{booking_id}", dependencies=[Depends(verify_admin_key)])
async def delete_booking_pdn(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена.")

    await db.delete(booking)
    await db.commit()
    return {"id": booking_id, "message": "Персональные данные и запись удалены."}


# --- Управление блокировкой слотов ---
@router.get("/blocked-slots", dependencies=[Depends(verify_admin_key)])
async def list_blocked_slots(
    date_str: str | None = Query(default=None, alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(BlockedSlot).order_by(BlockedSlot.block_date.desc(), BlockedSlot.block_time.asc())
    if date_str:
        stmt = stmt.where(BlockedSlot.block_date == date_str)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": r.id, "date": r.block_date, "time": r.block_time, "reason": r.reason} for r in rows]


@router.post("/blocked-slots", dependencies=[Depends(verify_admin_key)])
async def block_slot(
    payload: BlockedSlotCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    item = BlockedSlot(block_date=payload.date, block_time=payload.time, reason=payload.reason)
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Этот слот уже закрыт.") from exc
    return {"id": item.id, "date": item.block_date, "time": item.block_time, "reason": item.reason}


@router.delete("/blocked-slots/{slot_id}", dependencies=[Depends(verify_admin_key)])
async def unblock_slot(slot_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    item = (await db.execute(select(BlockedSlot).where(BlockedSlot.id == slot_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Блокировка не найдена.")
    await db.delete(item)
    await db.commit()
    return {"message": "Слот снова открыт для записи."}


# --- Диагностика уведомлений и статистика безопасности ---
@router.post("/test-notifications", dependencies=[Depends(verify_admin_key)])
async def trigger_test_notifications() -> dict:
    return await send_test_notifications()


@router.get("/security-stats", dependencies=[Depends(verify_admin_key)])
async def get_security_stats(db: AsyncSession = Depends(get_db)) -> dict:
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    blocked_24h = (
        await db.execute(
            select(func.count(SystemLog.id)).where(
                SystemLog.level == "SECURITY",
                SystemLog.created_at >= since_24h,
            )
        )
    ).scalar_one()
    return {"blockedAttacks24h": int(blocked_24h or 0)}


# --- Экспорт записей в CSV (для Excel) ---
@router.get("/export-csv", dependencies=[Depends(verify_admin_key)])
async def export_bookings_csv(
    date_str: str | None = Query(default=None, alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Booking).order_by(Booking.booking_date.desc(), Booking.booking_time.asc())
    if date_str:
        stmt = stmt.where(Booking.booking_date == date_str)
    rows = (await db.execute(stmt)).scalars().all()

    output = io.StringIO()
    # BOM для корректного открытия кириллицы в русском Microsoft Excel
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["ID", "Дата", "Время", "Госномер", "Телефон", "Статус", "Источник", "Примечание", "UTM", "Создано (UTC)"])

    status_map = {
        "confirmed": "Ожидается",
        "completed": "Прошёл ТО",
        "no_show": "Не явился",
        "cancelled": "Отменена",
    }
    for b in rows:
        writer.writerow([
            b.id,
            b.booking_date,
            b.booking_time,
            b.car_number,
            b.phone or "",
            status_map.get(b.status, b.status),
            "Сайт" if b.source == "online" else "Диспетчер",
            b.comment or "",
            b.utm_source or "",
            b.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    output.seek(0)
    filename = f"tehplus_bookings_{date_str or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/logs", dependencies=[Depends(verify_admin_key)])
async def get_system_logs(
    limit: int = Query(default=60, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(SystemLog).order_by(SystemLog.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": item.id,
            "level": item.level,
            "source": item.source,
            "message": item.message,
            "details": item.details,
            "urlPath": item.url_path,
            "clientIp": item.client_ip,
            "createdAt": item.created_at,
        }
        for item in rows
    ]


@router.delete("/logs", dependencies=[Depends(verify_admin_key)])
async def clear_system_logs(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(delete(SystemLog))
    await db.commit()
    return {"message": "Журнал событий очищен."}