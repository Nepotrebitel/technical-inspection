import asyncio
import logging
import smtplib
from email.message import EmailMessage
import httpx
from sqlalchemy import update

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Booking, SystemLog

logger = logging.getLogger(__name__)


def _sanitize_header(value: str) -> str:
    return value.replace("\r", "").replace("\n", " ").strip()


def _send_email_sync(subject: str, body: str) -> None:
    if not settings.smtp_enabled:
        raise RuntimeError("SMTP_ENABLED=false в файле .env")
    if not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("Не заданы SMTP_USER или SMTP_PASSWORD в .env")

    msg = EmailMessage()
    msg["Subject"] = _sanitize_header(subject)
    msg["From"] = settings.smtp_user
    msg["To"] = settings.smtp_to or settings.smtp_user
    msg.set_content(body)

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


async def _send_max_message(text: str) -> None:
    if not settings.max_bot_enabled:
        raise RuntimeError("MAX_BOT_ENABLED=false в файле .env")
    if not settings.max_bot_token or not settings.max_chat_id:
        raise RuntimeError("Не заданы MAX_BOT_TOKEN или MAX_CHAT_ID в .env")

    base_url = settings.max_api_url.rstrip("/")
    params = {
        "access_token": settings.max_bot_token,
        "chat_id": settings.max_chat_id,
    }
    payload = {"text": text}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(base_url, params=params, json=payload)
        response.raise_for_status()


async def notify_new_booking(
    booking_id: int,
    booking_date: str,
    booking_time: str,
    car_number: str,
    phone: str | None,
    slot_occupancy: int,
    source: str = "online",
) -> None:
    phone_display = phone if phone else "Не указан"
    source_label = "Онлайн с сайта" if source == "online" else "Ручная запись (диспетчер)"
    message_text = (
        f"Новая запись на техосмотр #{booking_id} ({source_label})\n"
        f"Дата и время: {booking_date} в {booking_time} (место {slot_occupancy} из {settings.max_bookings_per_slot})\n"
        f"Госномер: {car_number}\n"
        f"Телефон: {phone_display}"
    )

    email_state = "disabled"
    max_state = "disabled"

    # 1. Отправка на почту Яндекс
    if settings.smtp_enabled:
        subject = f"Запись на ТО #{booking_id}: {booking_date} в {booking_time} • {car_number}"
        try:
            await asyncio.to_thread(_send_email_sync, subject, message_text)
            email_state = "sent"
        except Exception as exc:
            email_state = "error"
            logger.error("Ошибка SMTP: %s", exc)
            async with AsyncSessionLocal() as session:
                session.add(
                    SystemLog(
                        level="ERROR",
                        source="smtp",
                        message=f"Ошибка отправки email по заявке #{booking_id}",
                        details=str(exc)[:1800],
                    )
                )
                await session.commit()

    # 2. Отправка в мессенджер MAX
    if settings.max_bot_enabled:
        try:
            await _send_max_message(message_text)
            max_state = "sent"
        except Exception as exc:
            max_state = "error"
            logger.error("Ошибка MAX Bot: %s", exc)
            async with AsyncSessionLocal() as session:
                session.add(
                    SystemLog(
                        level="ERROR",
                        source="max_bot",
                        message=f"Ошибка отправки в MAX по заявке #{booking_id}",
                        details=str(exc)[:1800],
                    )
                )
                await session.commit()

    # Сохраняем статусы доставки в саму запись
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(Booking)
            .where(Booking.id == booking_id)
            .values(email_status=email_state, max_status=max_state)
        )
        await session.commit()


async def send_test_notifications() -> dict[str, dict[str, str]]:
    """Проверка работы SMTP и мессенджера MAX по кнопке из админ-панели."""
    test_text = "Тестовое уведомление от системы бронирования ТЕХПЛЮС (РСА № 16412). Связь работает штатно!"
    result: dict[str, dict[str, str]] = {
        "email": {"status": "ok", "detail": "Письмо успешно отправлено"},
        "max": {"status": "ok", "detail": "Сообщение в MAX успешно отправлено"},
    }

    try:
        await asyncio.to_thread(_send_email_sync, "ТЕХПЛЮС: Тест уведомлений", test_text)
    except Exception as exc:
        result["email"] = {"status": "error", "detail": str(exc)}

    try:
        await _send_max_message(test_text)
    except Exception as exc:
        result["max"] = {"status": "error", "detail": str(exc)}

    return result