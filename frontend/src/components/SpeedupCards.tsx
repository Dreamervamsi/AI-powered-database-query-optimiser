import { formatMs } from "../utils";

interface Props {
  beforeMs: number;
  afterMs: number;
  improvementPct: number | null;
}

export default function SpeedupCards({ beforeMs, afterMs, improvementPct }: Props) {
  const showMicDrop = improvementPct != null && improvementPct >= 90;
  return (
    <div className="space-y-2">
      {showMicDrop && (
        <p className="text-sm text-optimised font-medium">
          ~{improvementPct}% faster — estimated from EXPLAIN ANALYZE
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Before</p>
          <p className="text-2xl font-semibold text-white font-mono">{formatMs(beforeMs)}</p>
        </div>
        <div className="rounded-lg bg-card border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">After</p>
          <p className="text-2xl font-semibold text-optimised font-mono">
            {afterMs > 0 ? formatMs(afterMs) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
