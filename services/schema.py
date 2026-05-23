import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

TABLE_PATTERN = re.compile(
    r"\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)",
    re.IGNORECASE,
)


def extract_table_names(sql: str) -> list[str]:
    tables = []
    for match in TABLE_PATTERN.finditer(sql):
        name = match.group(1)
        if "." in name:
            name = name.split(".")[-1]
        if name.lower() not in ("select", "where", "on", "as"):
            tables.append(name.lower())
    return list(dict.fromkeys(tables))


async def fetch_schema_context(session: AsyncSession, sql: str) -> str:
    tables = extract_table_names(sql)
    if not tables:
        return "No tables detected in query."

    lines: list[str] = []
    for table in tables:
        col_result = await session.execute(
            text(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table
                ORDER BY ordinal_position
                """
            ),
            {"table": table},
        )
        columns = col_result.fetchall()
        if not columns:
            continue

        lines.append(f"Table: {table}")
        for col_name, data_type, nullable in columns:
            lines.append(f"  - {col_name}: {data_type} (nullable={nullable})")

        idx_result = await session.execute(
            text(
                """
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = :table
                """
            ),
            {"table": table},
        )
        indexes = idx_result.fetchall()
        if indexes:
            lines.append("  Indexes:")
            for idx_name, idx_def in indexes:
                lines.append(f"    - {idx_name}: {idx_def}")
        else:
            lines.append("  Indexes: none")
        lines.append("")

    return "\n".join(lines) if lines else "Schema context unavailable for referenced tables."
