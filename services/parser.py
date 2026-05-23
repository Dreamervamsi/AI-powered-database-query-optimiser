import json
import re

from pydantic import BaseModel, Field


class OptimizationParseResult(BaseModel):
    root_cause: str
    optimized_sql: str
    index_suggestions: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


def _extract_json(text: str) -> str:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def parse_optimization_response(raw: str) -> OptimizationParseResult:
    json_text = _extract_json(raw)
    data = json.loads(json_text)

    if isinstance(data.get("index_suggestions"), str):
        data["index_suggestions"] = [data["index_suggestions"]] if data["index_suggestions"] else []

    return OptimizationParseResult.model_validate(data)
