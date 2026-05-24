import json
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

SELECT_ONLY = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)

# Functions that cause side-effects or intentional delays — running EXPLAIN ANALYZE
# on these would physically execute the delay and re-trigger the slow-query monitor
# creating an infinite analysis loop.
_SIDE_EFFECT_FN = re.compile(
    r"\b(pg_sleep|pg_sleep_for|pg_sleep_until|dblink|lo_import|lo_export)\b",
    re.IGNORECASE,
)


def is_safe_select(sql: str) -> bool:
    stripped = sql.strip().rstrip(";")
    if not SELECT_ONLY.match(stripped):
        return False
    forbidden = re.search(
        r"\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b",
        stripped,
        re.IGNORECASE,
    )
    if forbidden:
        return False
    # Block queries with side-effect / delay functions — EXPLAIN ANALYZE would
    # physically execute them and retrigger the slow-query interceptor.
    if _SIDE_EFFECT_FN.search(stripped):
        return False
    return True


async def run_explain_analyze(session: AsyncSession, sql: str) -> dict:
    if not is_safe_select(sql):
        raise ValueError("Only SELECT queries can be analyzed")

    explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql.strip().rstrip(';')}"
    result = await session.execute(text(explain_sql))
    row = result.fetchone()
    if not row:
        return {}
    plan = row[0]
    if isinstance(plan, str):
        return json.loads(plan)
    return plan if isinstance(plan, (dict, list)) else {"plan": plan}


def extract_execution_time_ms(explain_json) -> float | None:
    if isinstance(explain_json, list) and explain_json:
        root = explain_json[0]
    elif isinstance(explain_json, dict):
        root = explain_json
    else:
        return None

    planning = root.get("Planning Time", 0) or 0
    execution = root.get("Execution Time", 0) or 0
    return float(planning) + float(execution)
