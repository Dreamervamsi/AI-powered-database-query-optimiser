import { useEffect, useState } from "react";
import { fetchOptimization } from "../api";
import type { OptimizationDetail, QueueItem } from "../types";
import { formatMs } from "../utils";
import ApplyIndexButton from "./ApplyIndexButton";
import ConfidenceBar from "./ConfidenceBar";
import SpeedupCards from "./SpeedupCards";

interface Props {
  selected: QueueItem | null;
  onStatusChange: () => void;
}

export default function AiPanel({ selected, onStatusChange }: Props) {
  const [detail, setDetail] = useState<OptimizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [analyzeTimedOut, setAnalyzeTimedOut] = useState(false);
  const [analyzeSlow, setAnalyzeSlow] = useState(false);

  const isAnalyzing =
    selected != null &&
    (selected.isOptimistic ||
      selected.uiSeverity === "analyzing" ||
      !selected.root_cause?.trim());

  const isOptimised = selected?.status === "reviewed" || selected?.uiSeverity === "optimised";

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalyzeTimedOut(false);
      setAnalyzeSlow(false);
      return;
    }
    // After 20 s show a "still processing" note (Groq + cold DB can be slow)
    const tSlow = window.setTimeout(() => setAnalyzeSlow(true), 20000);
    // After 90 s give up and show the error card
    const tTimeout = window.setTimeout(() => setAnalyzeTimedOut(true), 90000);
    return () => {
      window.clearTimeout(tSlow);
      window.clearTimeout(tTimeout);
    };
  }, [isAnalyzing, selected?.id]);

  useEffect(() => {
    if (!selected || selected.id < 0) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetchOptimization(selected.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.status]);

  if (!selected) {
    return (
      <div className="rounded-xl border border-gray-800 bg-card p-8 text-center text-gray-500">
        Select a query from the queue to see AI analysis
      </div>
    );
  }

  if (analyzeTimedOut && isAnalyzing) {
    return (
      <div className="rounded-xl border border-gray-800 bg-card p-8 flex flex-col items-center justify-center gap-4 min-h-[280px] text-center">
        <p className="text-critical font-medium">Analysis did not complete</p>
        <p className="text-sm text-gray-400 max-w-md">
          Check the API server logs for errors (database connection, Groq model, or rate
          limit). Try Simulate slow query again.
        </p>
        <p className="text-gray-600 font-mono max-w-md truncate">
          {selected.sql_text.slice(0, 120)}
        </p>
      </div>
    );
  }

  if (isAnalyzing || (loadingDetail && !selected.root_cause?.trim())) {
    return (
      <div className="rounded-xl border border-gray-800 bg-card p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]">
        <div className="h-10 w-10 border-2 border-gray-600 border-t-optimised rounded-full animate-spin" />
        <p className="text-gray-400">Running EXPLAIN ANALYZE…</p>
        {analyzeSlow && (
          <p className="text-xs text-yellow-500 max-w-xs text-center">
            Still processing — Groq AI is analysing the query. This can take up to 90 s on a cold start.
          </p>
        )}
        <p className="text-xs text-gray-600 font-mono max-w-md text-center truncate">
          {selected.sql_text.slice(0, 120)}
        </p>
      </div>
    );
  }

  const rootCause = detail?.root_cause ?? selected.root_cause;
  const confidence = detail?.confidence ?? selected.confidence;
  const indexSuggestion = detail?.index_suggestions?.[0];
  const beforeMs = selected.duration_ms;
  const afterMs = selected.afterMs;

  if (isOptimised) {
    return (
      <div className="rounded-xl border border-gray-800 bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-optimised">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="font-semibold text-lg">Already optimised</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed animate-fadeIn">
          {indexSuggestion
            ? `Index suggestion was applied. Query now runs at ${formatMs(afterMs)} — down from ${formatMs(beforeMs)}.`
            : `This query was marked optimised. Current estimate: ${formatMs(afterMs)} vs ${formatMs(beforeMs)} before.`}
        </p>
        <SpeedupCards
          beforeMs={beforeMs}
          afterMs={afterMs}
          improvementPct={selected.improvementPct}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-card p-6 space-y-5">
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Root cause</h3>
        <p className="text-gray-200 leading-relaxed animate-fadeIn">{rootCause}</p>
      </div>
      <ConfidenceBar confidence={confidence} />
      <SpeedupCards
        beforeMs={beforeMs}
        afterMs={afterMs}
        improvementPct={selected.improvementPct}
      />
      <ApplyIndexButton
        optimizationId={selected.id}
        indexSuggestion={indexSuggestion}
        onApplied={onStatusChange}
      />
    </div>
  );
}
