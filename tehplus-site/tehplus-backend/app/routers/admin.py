import io
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import BlockedSlot, Booking, SystemLog
from app.notifications import notify_new_booking, send_test_notifications
from app.routers.bookings import _get_real_client_ip
from app.schemas import AdminBookingItem, AdminManualBookingCreate, BOOKING_STATUS, BlockedSlotCreate

router = APIRouter(prefix="/api/admin", tags=["Admin"])

_failed_admin_attempts: dict[str, list[float]] = defaultdict(list)
ADMIN_MAX_FAILS = 5
ADMIN_BAN_SECONDS = 900


def verify_admin_key(request: Request, x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    ip = _get_real_client_ip(request)
    now = time.monotonic()

    if len(_failed_admin_attempts) > 2000:
        expired = [k for k, v in _failed_admin_attempts.items() if not v or (now - v[-1] > ADMIN_BAN_SECONDS)]
        for k in expired:
            _failed_admin_attempts.pop(k, None)

    fails = [t for t in _failed_admin_attempts[ip] if now - t < ADMIN_BAN_SECONDS]
    _failed_admin_attempts[ip] = fails

    if len(fails) >= ADMIN_MAX_FAILS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много неверных попыток входа. Доступ заблокирован на 15 минут.",
        )

    if not x_admin_key or len(x_admin_key) > 256 or not secrets.compare_digest(x_admin_key, settings.admin_api_key):
        _failed_admin_attempts[ip].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный ключ доступа администратора.",
        )

    _failed_admin_attempts.pop(ip, None)


def _safe_csv_cell(value: str | None) -> str:
    if not value:
        return ""
    cleaned = str(value).replace("\r", " ").replace("\n", " ").strip()
    if cleaned.startswith(("=", "+", "-", "@", "\t")):
        return f"'{cleaned}"
    return cleaned


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


STATUS_LABELS: dict[str, str] = {
    "pending": "Ожидается",
    "confirmed": "Подтверждена",
    "completed": "Пройден",
    "no_show": "Не приехал",
    "cancelled": "Отменена",
}

SOURCE_LABELS: dict[str, str] = {
    "online": "Сайт",
    "site": "Сайт",
    "web": "Сайт",
    "phone": "По телефону",
    "manual": "Ручная запись",
}


@router.get("/export-csv", dependencies=[Depends(verify_admin_key)])
async def export_bookings_xlsx(
    date_filter: str | None = Query(default=None, alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    stmt = select(Booking).order_by(Booking.booking_date.desc(), Booking.booking_time.asc())
    if date_filter:
        stmt = stmt.where(Booking.booking_date == date_filter)

    bookings = (await db.execute(stmt)).scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Записи на ТО"

    headers = [
        "ID",
        "Дата",
        "Время",
        "Госномер",
        "Телефон",
        "Статус",
        "Источник",
        "Примечание",
        "UTM",
        "Создано (UTC)",
    ]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = Font(bold=True)
    ws.auto_filter.ref = f"A1:J{len(bookings) + 1}"

    for b in bookings:
        raw_date = getattr(b, "booking_date", "")
        date_str = raw_date.strftime("%d.%m.%Y") if hasattr(raw_date, "strftime") else str(raw_date or "")

        raw_created = getattr(b, "created_at", None)
        created_str = raw_created.strftime("%d.%m.%Y %H:%M") if hasattr(raw_created, "strftime") else str(raw_created or "")

        status_val = getattr(b, "status", "")
        source_val = getattr(b, "source", "")

        ws.append([
            b.id,
            date_str,
            b.booking_time,
            _safe_csv_cell(b.car_number),
            _safe_csv_cell(b.phone),
            STATUS_LABELS.get(status_val, status_val),
            SOURCE_LABELS.get(source_val, source_val),
            _safe_csv_cell(b.comment),
            _safe_csv_cell(b.utm_source),
            created_str,
        ])

    for column_cells in ws.columns:
        max_len = 0
        col_letter = column_cells[0].column_letter
        for cell in column_cells:
            val_len = len(str(cell.value or ""))
            if val_len > max_len:
                max_len = val_len
        ws.column_dimensions[col_letter].width = max_len + 4

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"tehplus-bookings-{date_filter or 'all'}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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