from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings


def _asyncpg_connect_args(database_url: str) -> tuple[str, dict]:
    """Strip sslmode from URL (asyncpg uses connect_args) — needed for Render external DB URLs."""
    parsed = urlparse(database_url)
    if not parsed.query:
        return database_url, {}
    qs = parse_qs(parsed.query, keep_blank_values=True)
    ssl_required = qs.pop("sslmode", [""])[0] == "require" or qs.pop("ssl", [""])[0] == "require"
    clean_query = urlencode({k: v[0] for k, v in qs.items() if v and v[0]})
    clean_url = urlunparse(parsed._replace(query=clean_query))
    return clean_url, ({"ssl": True} if ssl_required else {})


_db_url, _connect_args = _asyncpg_connect_args(settings.database_url)
engine = create_async_engine(_db_url, echo=False, connect_args=_connect_args)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from models.optimization import OptimizationResult, SlowQueryRecord  # noqa: F401
    from models.user import UserData  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
