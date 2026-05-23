from datetime import datetime

from pydantic import BaseModel, Field


class OptimizationListItem(BaseModel):
    id: int
    slow_query_id: int
    sql_text: str
    duration_ms: float
    route: str | None
    root_cause: str
    confidence: float
    status: str
    priority_score: float | None
    estimated_savings_ms: float | None
    execution_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class OptimizationDetail(BaseModel):
    id: int
    slow_query_id: int
    sql_text: str
    duration_ms: float
    route: str | None
    root_cause: str
    optimized_sql: str
    index_suggestions: list[str]
    confidence: float
    status: str
    priority_score: float | None
    estimated_savings_ms: float | None
    execution_count: int
    raw_response: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OptimizationStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|dismissed|reviewed)$")


class AnalyzeRequest(BaseModel):
    sql: str
    duration_ms: float = 1000.0
    route: str | None = "manual"
