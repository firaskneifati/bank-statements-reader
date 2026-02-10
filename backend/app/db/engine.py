from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import Session
from sqlmodel.ext.asyncio.session import AsyncSession as SQLModelAsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False) if settings.database_url else None

async_session_factory = (
    sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    if engine
    else None
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    if async_session_factory is None:
        raise RuntimeError("Database not configured — set DATABASE_URL")
    async with async_session_factory() as session:
        yield session
