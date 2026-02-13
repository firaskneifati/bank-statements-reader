import logging
import os
from contextlib import asynccontextmanager

from sqlalchemy import text
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

from app.config import settings
from app.limiter import limiter
from app.routers import upload, export, auth, usage, audit_router, billing, contact

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        from app.db.engine import engine

        if engine is not None:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection established")
    else:
        logger.info("No DATABASE_URL configured — running without database")
    yield


app = FastAPI(title="Bank Statement Reader", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a minute before uploading more files."},
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(upload.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(usage.router, prefix="/api/v1")
app.include_router(audit_router.router, prefix="/api/v1", tags=["audit"])
app.include_router(billing.router, prefix="/api/v1", tags=["billing"])
app.include_router(contact.router, prefix="/api/v1", tags=["contact"])

os.makedirs(settings.upload_dir, exist_ok=True)


@app.get("/")
async def health_check():
    return {"status": "ok"}
