import logging
import re
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

_SIDE_EFFECT_FN = re.compile(
    r"\b(pg_sleep|pg_sleep_for|pg_sleep_until|dblink|lo_import|lo_export)\b",
    re.IGNORECASE,
)


def _has_side_effects(sql: str) -> bool:
    """True for SELECT queries that are safe SQL but unsafe to EXPLAIN ANALYZE
    (e.g. contain pg_sleep). We still want to analyse these with Groq but must
    skip the EXPLAIN step to avoid physically executing the delay."""
    return bool(_SIDE_EFFECT_FN.search(sql))

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
    # Hard skip for non-SELECT statements (INSERT, UPDATE, etc.)
    # Use a simple regex here so we don't accidentally block pg_sleep SELECTs.
    if not re.match(r"^\s*(select|with)\b", sql_text.strip(), re.IGNORECASE):
        logger.warning("Skipping analysis for non-SELECT query")
        return None

    # Flag queries that contain side-effect functions (pg_sleep, etc.).
    # We still analyze them with Groq but skip EXPLAIN ANALYZE to avoid
    # physically executing the delay and re-triggering the slow-query monitor.
    skip_explain = _has_side_effects(sql_text)

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

            # Run EXPLAIN ANALYZE only when safe (skip for pg_sleep-style queries)
            if skip_explain:
                logger.info("Skipping EXPLAIN ANALYZE for query with side-effect function")
                explain_plan = {}
            else:
                explain_plan = await run_explain_analyze(session, sql_text)

            schema_context = await fetch_schema_context(session, sql_text)

            if settings.groq_api_key and not allow_groq_call():
                logger.warning("GROQ rate limit reached; skipping API call")
                return None

            parsed, raw = await groq_client.optimize_query(
                sql_text, explain_plan, schema_context, duration_ms
            )

            estimated_savings = None
            if not skip_explain:
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
