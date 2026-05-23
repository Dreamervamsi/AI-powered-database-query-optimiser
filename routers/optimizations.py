import hashlib

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from models.optimization import OptimizationResult, SlowQueryRecord
from schemas.optimization import (
    AnalyzeRequest,
    OptimizationDetail,
    OptimizationListItem,
    OptimizationStatusUpdate,
)
from services.analyzer import analyze_slow_query

router = APIRouter(prefix="/api/optimizations", tags=["optimizations"])


def _sql_hash(sql: str) -> str:
    normalized = " ".join(sql.split()).lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


def _to_list_item(opt: OptimizationResult) -> OptimizationListItem:
    sq = opt.slow_query
    return OptimizationListItem(
        id=opt.id,
        slow_query_id=sq.id,
        sql_text=sq.sql_text,
        duration_ms=sq.duration_ms,
        route=sq.route,
        root_cause=opt.root_cause,
        confidence=opt.confidence,
        status=opt.status,
        priority_score=opt.priority_score,
        estimated_savings_ms=opt.estimated_savings_ms,
        execution_count=sq.execution_count,
        created_at=opt.created_at,
    )


def _to_detail(opt: OptimizationResult) -> OptimizationDetail:
    sq = opt.slow_query
    return OptimizationDetail(
        id=opt.id,
        slow_query_id=sq.id,
        sql_text=sq.sql_text,
        duration_ms=sq.duration_ms,
        route=sq.route,
        root_cause=opt.root_cause,
        optimized_sql=opt.optimized_sql,
        index_suggestions=opt.index_suggestions or [],
        confidence=opt.confidence,
        status=opt.status,
        priority_score=opt.priority_score,
        estimated_savings_ms=opt.estimated_savings_ms,
        execution_count=sq.execution_count,
        raw_response=opt.raw_response,
        created_at=opt.created_at,
    )


@router.get("", response_model=list[OptimizationListItem])
async def list_optimizations(
    sort: str = "priority",
    db: AsyncSession = Depends(get_db),
):
    stmt = select(OptimizationResult).options(selectinload(OptimizationResult.slow_query))
    if sort == "confidence":
        stmt = stmt.order_by(OptimizationResult.confidence.desc())
    elif sort == "created_at":
        stmt = stmt.order_by(OptimizationResult.created_at.desc())
    else:
        stmt = stmt.order_by(OptimizationResult.priority_score.desc().nullslast())

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_to_list_item(r) for r in rows]


@router.get("/{optimization_id}", response_model=OptimizationDetail)
async def get_optimization(optimization_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(OptimizationResult)
        .where(OptimizationResult.id == optimization_id)
        .options(selectinload(OptimizationResult.slow_query))
    )
    opt = (await db.execute(stmt)).scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=404, detail="Optimization not found")
    return _to_detail(opt)


@router.patch("/{optimization_id}", response_model=OptimizationDetail)
async def update_optimization_status(
    optimization_id: int,
    body: OptimizationStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(OptimizationResult)
        .where(OptimizationResult.id == optimization_id)
        .options(selectinload(OptimizationResult.slow_query))
    )
    opt = (await db.execute(stmt)).scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=404, detail="Optimization not found")
    opt.status = body.status
    await db.commit()
    await db.refresh(opt)
    return _to_detail(opt)


@router.post("/analyze")
async def trigger_analysis(body: AnalyzeRequest, background_tasks: BackgroundTasks):
    sql_hash = _sql_hash(body.sql)
    background_tasks.add_task(
        analyze_slow_query,
        body.sql,
        sql_hash,
        body.duration_ms,
        body.route,
    )
    return {"status": "queued", "sql_hash": sql_hash}
