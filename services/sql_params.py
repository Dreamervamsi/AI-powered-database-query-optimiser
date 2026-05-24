import re
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


def to_sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return f"'{value.isoformat()}'"
    if isinstance(value, UUID):
        return f"'{value}'::uuid"
    if isinstance(value, bytes):
        return f"'\\x{value.hex()}'"
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def flatten_parameters(parameters) -> list:
    if parameters is None:
        return []
    if isinstance(parameters, dict):
        return list(parameters.values())
    if isinstance(parameters, (list, tuple)):
        if not parameters:
            return []
        first = parameters[0]
        if isinstance(first, dict):
            return list(first.values())
        if isinstance(first, (list, tuple)):
            return list(first)
        return list(parameters)
    return [parameters]


def inline_positional_params(sql: str, parameters) -> str:
    """Replace asyncpg-style $1, $2, ... placeholders with literal values."""
    params = flatten_parameters(parameters)
    if not params or not re.search(r"\$\d+", sql):
        return sql

    result = sql
    for i, val in enumerate(params, start=1):
        literal = to_sql_literal(val)
        result = re.sub(rf"\${i}(?:::[\w[\]]+(?:\([^)]*\))?)?", literal, result)
    return result
