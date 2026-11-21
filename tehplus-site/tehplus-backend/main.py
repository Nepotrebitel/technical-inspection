import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routers import admin, bookings


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

_rate_limit_minute: dict[str, list[float]] = defaultdict(list)
_rate_limit_hour: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Защита от переполнения памяти большими телами запросов (макс. 8 КБ)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 8192:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Слишком большой размер запроса."},
        )

    # 2. Антиспам лимиты (5 запросов в минуту, 15 в час с одного IP) на создание заявок
    if request.method == "POST" and request.url.path == "/api/leads":
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        now = time.monotonic()

        min_hits = [t for t in _rate_limit_minute[ip] if now - t < 60]
        hour_hits = [t for t in _rate_limit_hour[ip] if now - t < 3600]

        if len(min_hits) >= 5 or len(hour_hits) >= 15:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Слишком много заявок с вашего IP. Повторите попытку позже."},
            )

        min_hits.append(now)
        hour_hits.append(now)
        _rate_limit_minute[ip] = min_hits
        _rate_limit_hour[ip] = hour_hits

    response = await call_next(request)

    # 3. Заголовки безопасности браузера
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/api/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "tehplus-backend"}


app.include_router(bookings.router)
app.include_router(admin.router)