import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import engine, get_db, init_db
from middleware.query_monitor import drain_pending_slow_queries, install_query_monitor, request_route
from models.user import UserData
from routers.optimizations import router as optimizations_router
from services.analyzer import analyze_slow_query

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _schedule_analysis(payload: dict):
    asyncio.create_task(
        analyze_slow_query(
            payload["sql_text"],
            payload["sql_hash"],
            payload["duration_ms"],
            payload.get("route"),
        )
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    install_query_monitor(engine.sync_engine)
    yield


app = FastAPI(title="DB Query Optimizer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimizations_router)


@app.middleware("http")
async def track_route_middleware(request: Request, call_next):
    route = request.url.path
    token = request_route.set(route)
    try:
        response = await call_next(request)
        return response
    finally:
        request_route.reset(token)


@app.middleware("http")
async def process_pending_slow_queries(request: Request, call_next):
    response = await call_next(request)
    for payload in drain_pending_slow_queries():
        _schedule_analysis(payload)
    return response


@app.get("/users/{email}")
async def get_user(email: str, db: AsyncSession = Depends(get_db)):
    stmt = select(UserData).where(UserData.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return {"detail": "User not found"}
    return {"name": user.name, "email": user.email, "created_at": user.created_at.isoformat()}


@app.get("/users/slow-search")
async def slow_search(db: AsyncSession = Depends(get_db)):
    """Demo endpoint: intentional delay to trigger slow-query pipeline."""
    query = text("SELECT * FROM data WHERE EXISTS (SELECT pg_sleep(0.55))")
    result = await db.execute(query)
    rows = result.fetchall()
    return {"count": len(rows)}


@app.get("/health")
async def health():
    return {"status": "ok", "slow_threshold_ms": settings.slow_query_threshold_ms}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
