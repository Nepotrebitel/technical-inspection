import time
import traceback
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.models import SystemLog
from app.routers import admin, analytics, bookings


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Включаем WAL-режим для SQLite, чтобы чтение и запись не блокировали друг друга
        if settings.database_url.startswith("sqlite"):
            await conn.execute(text("PRAGMA journal_mode=WAL;"))
            await conn.execute(text("PRAGMA synchronous=NORMAL;"))
            await conn.execute(text("PRAGMA busy_timeout=5000;"))
    yield


app = FastAPI(
    title="ТЕХПЛЮС API (Пункт техосмотра РСА № 16412)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.app_env == "development" else None,
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
_admin_fail_hits: dict[str, list[float]] = defaultdict(list)

TRUSTED_PROXIES = {"127.0.0.1", "::1"}
ADMIN_BAN_SECONDS = 900  # 15 минут блокировки при подборе пароля
ADMIN_MAX_FAILS = 10     # Максимум 10 неверных попыток за 15 минут


def _get_real_client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else "unknown"
    if direct_ip in TRUSTED_PROXIES:
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()[:64]
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[-1].strip()[:64]
    return direct_ip[:64]


def _prune_ip_dict(storage: dict[str, list[float]], now: float, ttl: int) -> None:
    if len(storage) > 3000:
        expired_keys = [ip for ip, times in storage.items() if not times or (now - times[-1] > ttl)]
        for ip in expired_keys:
            storage.pop(ip, None)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    now = time.monotonic()
    ip = _get_real_client_ip(request)
    path = request.url.path

    # 1. Безопасная проверка размера тела запроса (защита от ValueError и переполнения RAM)
    max_body_bytes = 65536 if path == "/api/analytics/track" else 16384
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > max_body_bytes or int(content_length) < 0:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Слишком большой размер запроса."},
                )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Некорректный заголовок Content-Length."},
            )

    # 2. Анти-брутфорс защита админ-панели (/api/admin/*)
    if path.startswith("/api/admin"):
        _prune_ip_dict(_admin_fail_hits, now, ADMIN_BAN_SECONDS)
        recent_fails = [t for t in _admin_fail_hits[ip] if now - t < ADMIN_BAN_SECONDS]
        _admin_fail_hits[ip] = recent_fails
        if len(recent_fails) >= ADMIN_MAX_FAILS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Слишком много неудачных попыток входа. Доступ заблокирован на 15 минут."},
            )

    # 3. Жёсткий лимит на отправку заявок (5 в мин / 15 в час с IP)
    if request.method == "POST" and path == "/api/leads":
        _prune_ip_dict(_leads_min_hits, now, 60)
        _prune_ip_dict(_leads_hour_hits, now, 3600)

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

    # 4. Защита трекера аналитики и логов ошибок от флуда
    elif request.method == "POST" and path == "/api/analytics/track":
        _prune_ip_dict(_analytics_min_hits, now, 60)
        hits = [t for t in _analytics_min_hits[f"trk:{ip}"] if now - t < 60]
        if len(hits) >= 40:
            return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "Rate limit exceeded"})
        hits.append(now)
        _analytics_min_hits[f"trk:{ip}"] = hits

    elif request.method == "POST" and path == "/api/analytics/client-error":
        _prune_ip_dict(_analytics_min_hits, now, 60)
        hits = [t for t in _analytics_min_hits[f"err:{ip}"] if now - t < 60]
        if len(hits) >= 10:
            return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "Rate limit exceeded"})
        hits.append(now)
        _analytics_min_hits[f"err:{ip}"] = hits

    response = await call_next(request)

    # Фиксируем неудачные попытки авторизации в админку
    if path.startswith("/api/admin") and response.status_code in (401, 403):
        _admin_fail_hits[ip].append(now)
        if len(_admin_fail_hits[ip]) == ADMIN_MAX_FAILS:
            try:
                async with AsyncSessionLocal() as session:
                    session.add(
                        SystemLog(
                            level="SECURITY",
                            source="security",
                            message=f"Блокировка IP за попытку подбора ключа админа ({ADMIN_MAX_FAILS} попыток)",
                            url_path=path[:200],
                            client_ip=ip,
                        )
                    )
                    await session.commit()
            except Exception:
                pass

    # 5. Заголовки безопасности браузера
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store" if path.startswith("/api/admin") else "no-cache"
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
                    client_ip=_get_real_client_ip(request),
                )
            )
            await session.commit()
    except Exception:
        pass

    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Инцидент зафиксирован в журнале."},
    )