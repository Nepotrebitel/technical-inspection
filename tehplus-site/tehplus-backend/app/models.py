from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    car_number: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="M1 Легковые автомобили")

    booking_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    booking_time: Mapped[str] = mapped_column(String(5), nullable=False)               # HH:MM

    # Статусы: confirmed (ожидается), completed (прошёл ТО), no_show (не явился), cancelled (отменена — слот свободен)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed", index=True)
    # Источник: online (с сайта) или manual (ручная запись диспетчером)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="online")
    comment: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Статусы доставки уведомлений: pending, sent, disabled, error
    email_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    max_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    utm_source: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Юридическая фиксация согласия на обработку ПДн (152-ФЗ)
    consent_accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    consent_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_bookings_date_time_status", "booking_date", "booking_time", "status"),
    )


class BlockedSlot(Base):
    __tablename__ = "blocked_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    block_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    block_time: Mapped[str] = mapped_column(String(5), nullable=False)               # HH:MM
    reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("block_date", "block_time", name="uq_blocked_slot_date_time"),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    event_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    device_type: Mapped[str] = mapped_column(String(20), nullable=False, default="desktop")
    utm_source: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class SystemLog(Base):
    __tablename__ = "system_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)   # ERROR, WARNING, SECURITY
    source: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # backend, frontend, smtp, max_bot, security
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    details: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    url_path: Mapped[str | None] = mapped_column(String(200), nullable=True)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )