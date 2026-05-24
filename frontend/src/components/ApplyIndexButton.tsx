import { useState } from "react";
import { patchOptimizationStatus } from "../api";

interface Props {
  optimizationId: number;
  indexSuggestion?: string;
  onApplied: () => void;
}

export default function ApplyIndexButton({
  optimizationId,
  indexSuggestion,
  onApplied,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setLoading(true);
    setError(null);
    try {
      await patchOptimizationStatus(optimizationId, "reviewed");
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        className="w-full rounded-lg bg-optimised hover:bg-green-600 disabled:opacity-50 text-black font-semibold py-3 px-4 transition-colors"
      >
        {loading ? "Applying…" : "Apply index"}
      </button>
      {indexSuggestion && (
        <p className="text-xs text-gray-500 font-mono break-all" title={indexSuggestion}>
          Would run: {indexSuggestion.length > 80 ? indexSuggestion.slice(0, 80) + "…" : indexSuggestion}
        </p>
      )}
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
