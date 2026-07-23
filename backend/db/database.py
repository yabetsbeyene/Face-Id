"""
Async database engine + session factory.
We use asyncpg under the hood so FastAPI request handlers stay non-blocking.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config import settings


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""
    pass


engine = create_async_engine(settings.database_url, echo=(settings.app_env == "development"))

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency: yields a DB session per request, closes it after."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create tables on startup if they don't exist yet (fine for a hackathon; use Alembic for prod)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
