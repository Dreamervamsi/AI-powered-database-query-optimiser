import hashlib
import time
from contextvars import ContextVar
from typing import Callable

from sqlalchemy import event
from sqlalchemy.engine import Engine

from config import settings
from services.sql_params import inline_positional_params

request_route: ContextVar[str] = ContextVar("request_route", default="unknown")

_pending_slow_queries: list[dict] = []
_slow_query_handler: Callable | None = None


def set_slow_query_handler(handler: Callable):
    global _slow_query_handler
    _slow_query_handler = handler


def drain_pending_slow_queries() -> list[dict]:
    global _pending_slow_queries
    pending = _pending_slow_queries.copy()
    _pending_slow_queries = []
    return pending


def _sql_hash(sql: str) -> str:
    normalized = " ".join(sql.split()).lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


def install_query_monitor(sync_engine: Engine):
    @event.listens_for(sync_engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault("query_start_time", []).append(time.perf_counter())

    @event.listens_for(sync_engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        start_times = conn.info.get("query_start_time")
        if not start_times:
            return
        start = start_times.pop()
        duration_ms = (time.perf_counter() - start) * 1000

        if duration_ms < settings.slow_query_threshold_ms:
            return

        sql_text = inline_positional_params(str(statement), parameters)
        payload = {
            "sql_text": sql_text,
            "sql_hash": _sql_hash(sql_text),
            "duration_ms": duration_ms,
            "route": request_route.get(),
        }

        if _slow_query_handler:
            _slow_query_handler(payload)
        else:
            _pending_slow_queries.append(payload)
