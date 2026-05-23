import math

from services.explain import extract_execution_time_ms


def compute_priority_score(duration_ms: float, execution_count: int) -> float:
    return duration_ms * math.log1p(max(execution_count, 1))


def compute_estimated_savings(before_ms: float, after_explain_json) -> float | None:
    after_ms = extract_execution_time_ms(after_explain_json)
    if after_ms is None:
        return None
    return max(0.0, before_ms - after_ms)
