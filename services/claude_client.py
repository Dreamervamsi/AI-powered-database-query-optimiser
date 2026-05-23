from anthropic import Anthropic

from config import settings
from services.parser import OptimizationParseResult, parse_optimization_response
from services.prompts import SYSTEM_PROMPT, build_user_prompt


class ClaudeClient:
    def __init__(self):
        self._client = Anthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

    async def optimize_query(
        self,
        sql: str,
        explain_plan,
        schema_context: str,
        duration_ms: float,
    ) -> tuple[OptimizationParseResult, str]:
        user_prompt = build_user_prompt(sql, explain_plan, schema_context, duration_ms)

        if not self._client:
            mock = OptimizationParseResult(
                root_cause="Mock: sequential scan or missing index suspected (set ANTHROPIC_API_KEY for real analysis).",
                optimized_sql=sql,
                index_suggestions=[
                    "-- Example: CREATE INDEX idx_data_email ON data (email);"
                ],
                confidence=0.5,
            )
            return mock, json_dumps_mock(mock)

        message = self._client.messages.create(
            model=settings.claude_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = message.content[0].text
        try:
            parsed = parse_optimization_response(raw)
        except Exception:
            repair = self._client.messages.create(
                model=settings.claude_model,
                max_tokens=4096,
                system="Return only valid JSON matching the required optimization schema.",
                messages=[
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": "Your response was not valid JSON. Return ONLY valid JSON."},
                ],
            )
            raw = repair.content[0].text
            parsed = parse_optimization_response(raw)
        return parsed, raw


def json_dumps_mock(result: OptimizationParseResult) -> str:
    import json

    return json.dumps(result.model_dump())


claude_client = ClaudeClient()
