import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import SessionLocal
from models.optimization import OptimizationResult, OptimizationStatus, SlowQueryRecord
from services.groq_client import groq_client
from services.rate_limit import allow_groq_call
from services.enrichment import compute_estimated_savings, compute_priority_score
from services.explain import is_safe_select, run_explain_analyze
from services.schema import fetch_schema_context

logger = logging.getLogger(__name__)


async def _recent_analysis_exists(session: AsyncSession, sql_hash: str) -> bool:
    cutoff = datetime.utcnow() - timedelta(seconds=settings.analysis_dedup_seconds)
    stmt = (
        select(SlowQueryRecord.id)
        .where(SlowQueryRecord.sql_hash == sql_hash, SlowQueryRecord.created_at >= cutoff)
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _upsert_slow_query(
    session: AsyncSession,
    sql_text: str,
    sql_hash: str,
    duration_ms: float,
    route: str | None,
) -> SlowQueryRecord:
    stmt = select(SlowQueryRecord).where(SlowQueryRecord.sql_hash == sql_hash).limit(1)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.execution_count += 1
        existing.duration_ms = max(existing.duration_ms, duration_ms)
        if route:
            existing.route = route
        return existing

    record = SlowQueryRecord(
        sql_text=sql_text,
        sql_hash=sql_hash,
        duration_ms=duration_ms,
        route=route,
        execution_count=1,
    )
    session.add(record)
    await session.flush()
    return record


async def analyze_slow_query(
    sql_text: str,
    sql_hash: str,
    duration_ms: float,
    route: str | None = None,
) -> int | None:
    if not is_safe_select(sql_text):
        logger.warning("Skipping analysis for non-SELECT query")
        return None

    async with SessionLocal() as session:
        try:
            if await _recent_analysis_exists(session, sql_hash):
                logger.info("Skipping duplicate analysis for hash %s", sql_hash[:8])
                return None

            slow_record = await _upsert_slow_query(session, sql_text, sql_hash, duration_ms, route)

            existing_opt = await session.execute(
                select(OptimizationResult).where(OptimizationResult.slow_query_id == slow_record.id)
            )
            if existing_opt.scalar_one_or_none():
                await session.commit()
                return slow_record.id

            explain_plan = await run_explain_analyze(session, sql_text)
            schema_context = await fetch_schema_context(session, sql_text)

            if settings.groq_api_key and not allow_groq_call():
                logger.warning("GROQ rate limit reached; skipping API call")
                return None

            parsed, raw = await groq_client.optimize_query(
                sql_text, explain_plan, schema_context, duration_ms
            )

            estimated_savings = None
            try:
                after_plan = await run_explain_analyze(session, parsed.optimized_sql)
                estimated_savings = compute_estimated_savings(duration_ms, after_plan)
            except Exception as exc:
                logger.debug("Could not estimate savings: %s", exc)

            priority = compute_priority_score(duration_ms, slow_record.execution_count)

            optimization = OptimizationResult(
                slow_query_id=slow_record.id,
                root_cause=parsed.root_cause,
                optimized_sql=parsed.optimized_sql,
                index_suggestions=parsed.index_suggestions,
                confidence=parsed.confidence,
                status=OptimizationStatus.PENDING.value,
                raw_response=raw,
                estimated_savings_ms=estimated_savings,
                priority_score=priority,
            )
            session.add(optimization)
            await session.commit()
            return optimization.id
        except Exception:
            await session.rollback()
            logger.exception("Failed to analyze slow query")
            return None
