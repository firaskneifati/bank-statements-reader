import logging
import os
from contextlib import asynccontextmanager

from sqlalchemy import text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import upload, export, auth

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(upload.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")

os.makedirs(settings.upload_dir, exist_ok=True)


@app.get("/")
async def health_check():
    return {"status": "ok"}
