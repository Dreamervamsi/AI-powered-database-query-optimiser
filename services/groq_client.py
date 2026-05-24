import json
from groq import AsyncGroq
from config import settings
from services.parser import OptimizationParseResult, parse_optimization_response
from services.prompts import SYSTEM_PROMPT, build_user_prompt


class GroqClient:
    def __init__(self):
        api_key = settings.groq_api_key
        # Initialize the AsyncGroq client
        self._client = AsyncGroq(api_key=api_key) if api_key else None

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
                root_cause="Mock: sequential scan suspected (set GROQ_API_KEY).",
                optimized_sql=sql,
                index_suggestions=["-- Example: CREATE INDEX idx_data_email ON data (email);"],
                confidence=0.5,
            )
            return mock, json_dumps_mock(mock)

        # Call Groq asynchronously using the correct chat.completions API
        completion = await self._client.chat.completions.create(
            model=settings.groq_model,
            max_tokens=4096,
            temperature=0.0, # Low temperature ensures strict JSON compliance
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
        )
        raw = completion.choices[0].message.content or ""

        try:
            parsed = parse_optimization_response(raw)
        except Exception:
            # Native async repair call
            repair = await self._client.chat.completions.create(
                model=settings.groq_model,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": "Return only valid JSON matching the schema."},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": "Your response was not valid JSON. Return ONLY valid JSON."},
                ],
            )
            raw = repair.choices[0].message.content or ""
            parsed = parse_optimization_response(raw)
            
        return parsed, raw


def json_dumps_mock(result: OptimizationParseResult) -> str:
    return json.dumps(result.model_dump())


groq_client = GroqClient()
