import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="API Техплюс")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# ОБНОВЛЕННАЯ СТРУКТУРА ДАННЫХ (Под новую форму)
class LeadRequest(BaseModel):
    carNumber: str = Field(...)
    phone: str = Field(...)
    category: str = Field(...)
    date: str = Field(...)
    time: str = Field(...)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/leads")
async def create_lead(lead: LeadRequest):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise HTTPException(status_code=500, detail="Telegram credentials not configured")

    # ОБНОВЛЕННЫЙ ТЕКСТ СООБЩЕНИЯ
    message_text = (
        f"🔔 <b>Новая бронь на линию ТО!</b>\n\n"
        f"🚘 <b>Госномер:</b> {lead.carNumber.upper()}\n"
        f"📞 <b>Телефон:</b> {lead.phone}\n"
        f"📋 <b>Категория:</b> {lead.category}\n\n"
        f"🗓 <b>Дата:</b> {lead.date}\n"
        f"⏰ <b>Время:</b> {lead.time}"
    )

    telegram_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message_text,
        "parse_mode": "HTML"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(telegram_url, json=payload)
            response.raise_for_status()
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to send message")

    return {"status": "success", "message": "Заявка отправлена"}