import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchOptimizations } from "../api";
import type { ListFilter, Optimization, QueueItem, UiSeverity } from "../types";

const SLOW_SEARCH_SQL =
  "SELECT * FROM data WHERE EXISTS (SELECT pg_sleep(0.55))";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function matchesOptimistic(m: Optimization, optimistic: QueueItem): boolean {
  if (optimistic.id > 0 && m.id === optimistic.id) return true;
  if (normalizeSql(m.sql_text) === normalizeSql(optimistic.sql_text)) return true;
  if (
    optimistic.route &&
    m.route === optimistic.route &&
    Boolean(m.root_cause?.trim())
  ) {
    return new Date(m.created_at).getTime() >= new Date(optimistic.created_at).getTime();
  }
  return false;
}

function computeSeverity(
  opt: Optimization,
  thresholdMs: number
): UiSeverity {
  if (opt.status === "reviewed") return "optimised";
  if (!opt.root_cause || opt.root_cause.trim() === "") return "analyzing";
  if (opt.duration_ms >= thresholdMs * 2) return "critical";
  if (opt.duration_ms >= thresholdMs) return "high";
  return "high";
}

function toQueueItem(opt: Optimization, thresholdMs: number): QueueItem {
  const savings = opt.estimated_savings_ms ?? 0;
  const afterMs = Math.max(0, opt.duration_ms - savings);
  const improvementPct =
    opt.duration_ms > 0 && opt.estimated_savings_ms != null
      ? Math.round((1 - afterMs / opt.duration_ms) * 100)
      : null;
  return {
    ...opt,
    uiSeverity: computeSeverity(opt, thresholdMs),
    afterMs,
    improvementPct,
  };
}

export function useOptimizations(
  slowThresholdMs: number,
  pollMs = 1500
) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optimisticRef = useRef<QueueItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOptimizations("priority");
      const mapped = data
        .filter((o) => o.status !== "dismissed")
        .map((o) => toQueueItem(o, slowThresholdMs));

      if (optimisticRef.current) {
        const found = mapped.some((m) =>
          matchesOptimistic(m, optimisticRef.current!)
        );
        if (found) optimisticRef.current = null;
      }

      const pending = optimisticRef.current;
      const merged = pending
        ? [pending, ...mapped.filter((m) => m.id !== pending.id)]
        : mapped;

      setItems(merged);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slowThresholdMs]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const addOptimisticPending = useCallback(
    (sqlHint = SLOW_SEARCH_SQL) => {
      const pending: QueueItem = {
        id: -Date.now(),
        slow_query_id: -1,
        sql_text: sqlHint,
        duration_ms: slowThresholdMs + 200,
        route: "/users/slow-search",
        root_cause: "",
        confidence: 0,
        status: "pending",
        priority_score: null,
        estimated_savings_ms: null,
        execution_count: 1,
        created_at: new Date().toISOString(),
        uiSeverity: "analyzing",
        afterMs: 0,
        improvementPct: null,
        isOptimistic: true,
      };
      optimisticRef.current = pending;
      setItems((prev) => [pending, ...prev.filter((p) => !p.isOptimistic)]);
    },
    [slowThresholdMs]
  );

  const filterItems = useCallback(
    (filter: ListFilter) => {
      if (filter === "critical")
        return items.filter(
          (i) => i.uiSeverity === "critical" || i.uiSeverity === "analyzing"
        );
      if (filter === "pending")
        return items.filter((i) => i.status === "pending");
      return items;
    },
    [items]
  );

  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    const todayItems = items.filter(
      (i) => new Date(i.created_at).toDateString() === today && !i.isOptimistic
    );
    const reviewed = items.filter((i) => i.status === "reviewed");
    const durations = items.filter((i) => !i.isOptimistic).map((i) => i.duration_ms);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const improvements = reviewed
      .map((i) => i.improvementPct)
      .filter((p): p is number => p != null);
    const avgImprovement =
      improvements.length > 0
        ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length)
        : 0;
    return {
      slowToday: todayItems.length || items.filter((i) => !i.isOptimistic).length,
      avgDuration,
      optimisedCount: reviewed.length,
      avgImprovement,
    };
  }, [items]);

  return {
    items,
    loading,
    error,
    refresh,
    addOptimisticPending,
    filterItems,
    kpis,
  };
}
