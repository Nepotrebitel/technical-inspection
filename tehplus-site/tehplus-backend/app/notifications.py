import asyncio
import logging
import smtplib
from email.message import EmailMessage
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _send_email_sync(subject: str, body: str) -> None:
    if not settings.smtp_enabled or not settings.smtp_user or not settings.smtp_password:
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = settings.smtp_to or settings.smtp_user
    msg.set_content(body)

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


async def _send_max_message(text: str) -> None:
    if not settings.max_bot_enabled or not settings.max_bot_token or not settings.max_chat_id:
        return

    # Официальный Bot API мессенджера MAX (platform-api.max.ru)
    url = f"{settings.max_api_url.rstrip('/')}?access_token={settings.max_bot_token}&chat_id={settings.max_chat_id}"
    payload = {"text": text}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()


async def notify_new_booking(
    booking_id: int,
    booking_date: str,
    booking_time: str,
    category: str,
    phone: str,
    car_number: str | None,
    slot_occupancy: int,
) -> None:
    plate_display = car_number if car_number else "Не указан"
    message_text = (
        f"Новая запись на техосмотр #{booking_id}\n"
        f"Дата и время: {booking_date} в {booking_time} (место {slot_occupancy} из {settings.max_bookings_per_slot})\n"
        f"Категория ТС: {category}\n"
        f"Госномер: {plate_display}\n"
        f"Телефон: {phone}"
    )

    # 1. Отправка на российскую почту (Яндекс SMTP)
    if settings.smtp_enabled:
        subject = f"Запись на ТО #{booking_id}: {booking_date} в {booking_time} ({category})"
        try:
            await asyncio.to_thread(_send_email_sync, subject, message_text)
        except Exception as exc:
            logger.error("Ошибка отправки email через SMTP: %s", exc)

    # 2. Отправка в российский мессенджер MAX
    if settings.max_bot_enabled:
        try:
            await _send_max_message(message_text)
        except Exception as exc:
            logger.error("Ошибка отправки уведомления в мессенджер MAX: %s", exc)