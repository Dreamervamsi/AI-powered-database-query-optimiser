export type OptimizationStatus = "pending" | "dismissed" | "reviewed";

export interface Optimization {
  id: number;
  slow_query_id: number;
  sql_text: string;
  duration_ms: number;
  route: string | null;
  root_cause: string;
  confidence: number;
  status: OptimizationStatus;
  priority_score: number | null;
  estimated_savings_ms: number | null;
  execution_count: number;
  created_at: string;
}

export interface OptimizationDetail extends Optimization {
  optimized_sql: string;
  index_suggestions: string[];
  raw_response: string | null;
}

export interface HealthResponse {
  status: string;
  slow_threshold_ms: number;
}

export type UiSeverity = "critical" | "high" | "optimised" | "analyzing";

export type ListFilter = "all" | "critical" | "pending";

export interface QueueItem extends Optimization {
  uiSeverity: UiSeverity;
  afterMs: number;
  improvementPct: number | null;
  isOptimistic?: boolean;
}
