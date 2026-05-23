import json

SYSTEM_PROMPT = """You are a PostgreSQL performance expert.
Analyze the slow query using the execution plan and schema context.
Respond with ONLY valid JSON (no markdown fences) using this exact structure:
{
  "root_cause": "brief explanation of the bottleneck",
  "optimized_sql": "rewritten SELECT query",
  "index_suggestions": ["CREATE INDEX ...", "..."],
  "confidence": 0.85
}
Rules:
- optimized_sql must be a valid PostgreSQL SELECT
- index_suggestions is an array of CREATE INDEX DDL strings (can be empty)
- confidence is a float between 0 and 1
"""


def build_user_prompt(sql: str, explain_plan, schema_context: str, duration_ms: float) -> str:
    if isinstance(explain_plan, (dict, list)):
        plan_text = json.dumps(explain_plan, indent=2)
    else:
        plan_text = str(explain_plan)

    return f"""Slow query detected ({duration_ms:.2f} ms):

SQL:
{sql}

EXPLAIN ANALYZE (JSON):
{plan_text}

Schema context:
{schema_context}
"""
