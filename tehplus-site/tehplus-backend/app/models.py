from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    car_number: Mapped[str | None] = mapped_column(String(16), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)

    booking_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    booking_time: Mapped[str] = mapped_column(String(5), nullable=False)               # HH:MM

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed", index=True)

    # Фиксация согласия по 152-ФЗ
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