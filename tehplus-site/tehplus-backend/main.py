import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
from app.database import AsyncSessionLocal
from app.models import SystemLog
from app.config import settings
from app.database import Base, engine
from app.routers import admin, analytics, bookings


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="ТЕХПЛЮС API (Пункт техосмотра РСА № 16412)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Admin-Key"],
)

_leads_min_hits: dict[str, list[float]] = defaultdict(list)
_leads_hour_hits: dict[str, list[float]] = defaultdict(list)
_analytics_min_hits: dict[str, list[float]] = defaultdict(list)


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

def _prune_ip_dict(storage: dict[str, list[float]], now: float, ttl: int) -> None:
    if len(storage) > 5000:
        expired_keys = [ip for ip, times in storage.items() if not times or (now - times[-1] > ttl)]
        for ip in expired_keys:
            storage.pop(ip, None)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Ограничение размера тела запроса (не более 16 КБ)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 16384:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Слишком большой размер запроса."},
        )

    now = time.monotonic()

    # 2. Жёсткий лимит на отправку заявок (5 в мин / 15 в час с IP)
    if request.method == "POST" and request.url.path == "/api/leads":
        ip = _get_ip(request)
        min_hits = [t for t in _leads_min_hits[ip] if now - t < 60]
        hour_hits = [t for t in _leads_hour_hits[ip] if now - t < 3600]

        if len(min_hits) >= 5 or len(hour_hits) >= 15:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Слишком много заявок с вашего IP. Повторите попытку позже."},
            )

        min_hits.append(now)
        hour_hits.append(now)
        _leads_min_hits[ip] = min_hits
        _leads_hour_hits[ip] = hour_hits

    # 3. Защита трекера аналитики от флуда (не более 30 пакетов в минуту с IP)
    elif request.method == "POST" and request.url.path == "/api/analytics/client-error":
        ip = _get_real_client_ip(request)
        hits = [t for t in _analytics_min_hits[f"err:{ip}"] if now - t < 60]
        if len(hits) >= 10:
            return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "Rate limit exceeded"})
        hits.append(now)
        _analytics_min_hits[f"err:{ip}"] = hits

    response = await call_next(request)

    # 4. Заголовки безопасности браузера
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/api/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "tehplus-backend"}


app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(analytics.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()[-1800:]
    try:
        async with AsyncSessionLocal() as session:
            session.add(
                SystemLog(
                    level="ERROR",
                    source="backend",
                    message=f"{type(exc).__name__}: {str(exc)[:400]}",
                    details=tb,
                    url_path=str(request.url.path)[:200],
                    client_ip=_get_ip(request),
                )
            )
            await session.commit()
    except Exception:
        pass

    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Инцидент зафиксирован в журнале."},
    )