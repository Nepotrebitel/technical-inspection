from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AnalyticsEvent, Booking, SystemLog
from app.routers.admin import verify_admin_key

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


class EventItem(BaseModel):
    sessionId: str = Field(..., min_length=8, max_length=64, pattern=r"^[a-zA-Z0-9\-_]+$")
    eventType: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$")
    eventLabel: str | None = Field(default=None, max_length=120)
    durationSec: int = Field(default=0, ge=0, le=7200)
    deviceType: str = Field(default="desktop", pattern=r"^(mobile|desktop|tablet)$")
    utmSource: str | None = Field(default=None, max_length=100)
    utmCampaign: str | None = Field(default=None, max_length=100)


class EventBatch(BaseModel):
    events: list[EventItem] = Field(..., min_length=1, max_length=30)


class ClientErrorCreate(BaseModel):
    message: str = Field(..., min_length=2, max_length=500)
    details: str | None = Field(default=None, max_length=2000)
    urlPath: str | None = Field(default=None, max_length=200)


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT)
async def track_events(
    payload: EventBatch,
    db: AsyncSession = Depends(get_db),
) -> None:
    now_utc = datetime.now(timezone.utc)
    records = [
        AnalyticsEvent(
            session_id=item.sessionId,
            event_type=item.eventType,
            event_label=item.eventLabel,
            duration_sec=item.durationSec,
            device_type=item.deviceType,
            utm_source=item.utmSource,
            utm_campaign=item.utmCampaign,
            created_at=now_utc,
        )
        for item in payload.events
    ]
    db.add_all(records)
    await db.commit()


@router.post("/client-error", status_code=status.HTTP_204_NO_CONTENT)
async def report_client_error(
    payload: ClientErrorCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> None:
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip()[:64] if forwarded else (request.client.host[:64] if request.client else None)

    db.add(
        SystemLog(
            level="ERROR",
            source="frontend",
            message=payload.message,
            details=payload.details,
            url_path=payload.urlPath,
            client_ip=ip,
        )
    )
    await db.commit()


@router.get("/report", dependencies=[Depends(verify_admin_key)])
async def get_behavior_report(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. Уникальные сессии и активное время
    session_subq = (
        select(
            AnalyticsEvent.session_id,
            func.max(AnalyticsEvent.duration_sec).label("max_sec"),
            func.max(AnalyticsEvent.device_type).label("device"),
        )
        .where(AnalyticsEvent.created_at >= since)
        .group_by(AnalyticsEvent.session_id)
        .subquery()
    )
    sessions_stats = (
        await db.execute(select(func.count(session_subq.c.session_id), func.avg(session_subq.c.max_sec)))
    ).one()

    total_sessions = int(sessions_stats[0] or 0)
    avg_time_sec = round(float(sessions_stats[1] or 0), 1)

    devices = {
        row[0]: int(row[1])
        for row in (await db.execute(select(session_subq.c.device, func.count()).group_by(session_subq.c.device))).all()
    }

    # 2. Секции и клики
    sections_viewed = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(AnalyticsEvent.event_label, func.count(func.distinct(AnalyticsEvent.session_id)))
                .where(AnalyticsEvent.created_at >= since, AnalyticsEvent.event_type == "section_view")
                .group_by(AnalyticsEvent.event_label)
                .order_by(func.count(func.distinct(AnalyticsEvent.session_id)).desc())
            )
        ).all()
        if row[0]
    }

    action_counts = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(AnalyticsEvent.event_label, func.count(func.distinct(AnalyticsEvent.session_id)))
                .where(AnalyticsEvent.created_at >= since, AnalyticsEvent.event_type == "click_action")
                .group_by(AnalyticsEvent.event_label)
            )
        ).all()
        if row[0]
    }

    # 3. Статистика заявок и фактической явки
    bookings_stats = (
        await db.execute(
            select(
                func.count(Booking.id).label("total"),
                func.sum(case((Booking.status == "completed", 1), else_=0)).label("completed"),
                func.sum(case((Booking.status == "no_show", 1), else_=0)).label("no_show"),
                func.sum(case((Booking.status == "cancelled", 1), else_=0)).label("cancelled"),
            ).where(Booking.created_at >= since, Booking.source == "online")
        )
    ).one()

    online_bookings = int(bookings_stats.total or 0)
    completed_count = int(bookings_stats.completed or 0)
    no_show_count = int(bookings_stats.no_show or 0)
    cancelled_count = int(bookings_stats.cancelled or 0)

    # 4. Пошаговая воронка формы бронирования
    booking_funnel = [
        {"step": "1. Открыли сайт", "count": total_sessions},
        {"step": "2. Дошли до блока записи (#booking)", "count": sections_viewed.get("booking", 0)},
        {"step": "3. Начали вводить госномер", "count": action_counts.get("form_start", 0)},
        {"step": "4. Выбрали дату визита", "count": action_counts.get("booking_date_selected", 0)},
        {"step": "5. Выбрали слот времени", "count": action_counts.get("booking_time_selected", 0)},
        {"step": "6. Оформили запись", "count": online_bookings},
    ]

    # 5. Тепловая карта часов загрузки (сколько машин записывается на каждый слот)
    heatmap_rows = (
        await db.execute(
            select(Booking.booking_time, func.count(Booking.id))
            .where(Booking.created_at >= since, Booking.status.in_(("confirmed", "completed", "no_show")))
            .group_by(Booking.booking_time)
            .order_by(Booking.booking_time.asc())
        )
    ).all()
    hourly_heatmap = [{"time": row[0], "count": int(row[1])} for row in heatmap_rows]

    # 6. Источники трафика (UTM)
    traffic_sources = {
        row[0]: int(row[1])
        for row in (
            await db.execute(
                select(
                    func.coalesce(AnalyticsEvent.utm_source, "Прямой заход / Поиск"),
                    func.count(func.distinct(AnalyticsEvent.session_id)),
                )
                .where(AnalyticsEvent.created_at >= since)
                .group_by(AnalyticsEvent.utm_source)
            )
        ).all()
    }

    conversion_rate = round((online_bookings / total_sessions * 100), 2) if total_sessions > 0 else 0.0

    return {
        "periodDays": days,
        "overview": {
            "uniqueVisitors": total_sessions,
            "avgActiveTimeSec": avg_time_sec,
            "confirmedBookings": online_bookings,
            "conversionPercent": conversion_rate,
            "completedVisits": completed_count,
            "noShowVisits": no_show_count,
            "cancelledVisits": cancelled_count,
        },
        "bookingFunnel": booking_funnel,
        "hourlyHeatmap": hourly_heatmap,
        "devices": devices,
        "sectionsReached": sections_viewed,
        "topUserActions": action_counts,
        "trafficSources": traffic_sources,
    }