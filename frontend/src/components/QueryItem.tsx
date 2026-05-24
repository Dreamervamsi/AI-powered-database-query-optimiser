import type { QueueItem } from "../types";
import { formatMs, formatRelativeTime, formatRoute, truncateSql } from "../utils";

interface Props {
  item: QueueItem;
  selected: boolean;
  maxDuration: number;
  onSelect: () => void;
  flash?: boolean;
}

const BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-critical text-white" },
  high: { label: "High", className: "bg-high text-black" },
  optimised: { label: "Optimised", className: "bg-optimised text-white" },
  analyzing: { label: "Analyzing", className: "bg-gray-600 text-white" },
};

export default function QueryItem({
  item,
  selected,
  maxDuration,
  onSelect,
  flash,
}: Props) {
  const badge = BADGE[item.uiSeverity] ?? BADGE.high;
  const barPct = maxDuration > 0 ? Math.min(100, (item.duration_ms / maxDuration) * 100) : 0;
  const barColor =
    item.uiSeverity === "optimised"
      ? "bg-optimised"
      : item.uiSeverity === "critical" || item.uiSeverity === "analyzing"
        ? "bg-critical"
        : "bg-high";
  const msColor =
    item.uiSeverity === "optimised"
      ? "text-optimised"
      : item.uiSeverity === "critical"
        ? "text-critical"
        : "text-gray-300";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected
          ? "border-gray-600 bg-cardHover"
          : "border-gray-800 bg-card hover:bg-cardHover"
      } ${flash ? "animate-flash" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-xs text-gray-500 shrink-0">
          {item.isOptimistic ? "just now" : formatRelativeTime(item.created_at)}
        </span>
      </div>
      <p className="text-xs text-gray-400 font-mono mb-1">{formatRoute(item.route)}</p>
      <p className="text-sm font-mono text-gray-200 leading-snug mb-2">{truncateSql(item.sql_text)}</p>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className={`font-mono font-medium ${msColor}`}>
          {item.uiSeverity === "optimised" && item.afterMs > 0
            ? formatMs(item.afterMs)
            : formatMs(item.duration_ms)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
      </div>
    </button>
  );
}
