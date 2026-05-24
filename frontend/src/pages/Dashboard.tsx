import { useCallback, useEffect, useMemo, useState } from "react";
import { triggerSlowSearch } from "../api";
import AiPanel from "../components/AiPanel";
import InterceptorStatus from "../components/InterceptorStatus";
import QueryList from "../components/QueryList";
import { useHealth } from "../hooks/useHealth";
import { useOptimizations } from "../hooks/useOptimizations";
import type { ListFilter } from "../types";
import { formatMs } from "../utils";

function KpiDivider() {
  return <div className="hidden sm:block w-px h-10 bg-gray-800" />;
}

export default function Dashboard() {
  const { health, live } = useHealth();
  const threshold = health?.slow_threshold_ms ?? 500;
  const {
    items,
    loading,
    error,
    refresh,
    addOptimisticPending,
    filterItems,
    kpis,
  } = useOptimizations(threshold);

  const [filter, setFilter] = useState<ListFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);

  const filtered = filterItems(filter);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    if (selectedId == null && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedId != null && selectedId < 0) {
      const real = items.find((i) => !i.isOptimistic);
      if (real) setSelectedId(real.id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    const newest = items.find((i) => !i.isOptimistic && i.uiSeverity === "critical");
    if (newest && selectedId == null) {
      setSelectedId(newest.id);
      setFlashId(newest.id);
      const t = setTimeout(() => setFlashId(null), 1200);
      return () => clearTimeout(t);
    }
  }, [items, selectedId]);

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    addOptimisticPending();
    try {
      await triggerSlowSearch();
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  }, [addOptimisticPending, refresh]);

  const handleStatusChange = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-surface text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">DB Query Optimizer</h1>
          <InterceptorStatus live={live} thresholdMs={threshold} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-8 py-4 border-b border-gray-800">
          <div>
            <p className="text-xs text-gray-500 uppercase">Slow queries today</p>
            <p className="text-2xl font-bold text-critical">{kpis.slowToday}</p>
          </div>
          <KpiDivider />
          <div>
            <p className="text-xs text-gray-500 uppercase">Avg duration</p>
            <p className="text-2xl font-bold text-white">{formatMs(kpis.avgDuration)}</p>
          </div>
          <KpiDivider />
          <div>
            <p className="text-xs text-gray-500 uppercase">Optimised so far</p>
            <p className="text-2xl font-bold text-optimised">{kpis.optimisedCount}</p>
          </div>
          <KpiDivider />
          <div>
            <p className="text-xs text-gray-500 uppercase">Avg improvement</p>
            <p className="text-2xl font-bold text-optimised">
              {kpis.avgImprovement > 0 ? `${kpis.avgImprovement}%` : "—"}
            </p>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating || !live}
              className="rounded-lg border border-gray-700 hover:border-gray-500 px-4 py-2 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {simulating ? "Capturing…" : "Simulate slow query"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-critical bg-critical/10 border border-critical/30 rounded-lg px-4 py-2">
            {error} — cannot reach the API at{" "}
            <span className="font-mono text-xs">ai-powered-database-query-optimiser.onrender.com</span>
            . Check CORS on the API service or wait for a cold start (~1 min).
          </p>
        )}

        {loading && items.length === 0 ? (
          <p className="text-gray-500 text-center py-20">Loading optimizations…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[calc(100vh-220px)]">
            <div className="lg:col-span-2 flex flex-col min-h-[400px]">
              <QueryList
                items={filtered}
                filter={filter}
                onFilterChange={setFilter}
                selectedId={selectedId}
                onSelect={setSelectedId}
                flashId={flashId}
              />
            </div>
            <div className="lg:col-span-3">
              <AiPanel selected={selected} onStatusChange={handleStatusChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
