from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class OptimizationStatus(str, Enum):
    PENDING = "pending"
    DISMISSED = "dismissed"
    REVIEWED = "reviewed"


class SlowQueryRecord(Base):
    __tablename__ = "slow_queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sql_hash: Mapped[str] = mapped_column(String(64), index=True)
    sql_text: Mapped[str] = mapped_column(Text)
    duration_ms: Mapped[float] = mapped_column(Float)
    route: Mapped[str | None] = mapped_column(String(255), nullable=True)
    execution_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    optimization: Mapped["OptimizationResult | None"] = relationship(
        back_populates="slow_query", uselist=False
    )


class OptimizationResult(Base):
    __tablename__ = "optimization_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slow_query_id: Mapped[int] = mapped_column(ForeignKey("slow_queries.id"), unique=True)
    root_cause: Mapped[str] = mapped_column(Text)
    optimized_sql: Mapped[str] = mapped_column(Text)
    index_suggestions: Mapped[list] = mapped_column(JSONB, default=list)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default=OptimizationStatus.PENDING.value)
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_savings_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    slow_query: Mapped["SlowQueryRecord"] = relationship(back_populates="optimization")
