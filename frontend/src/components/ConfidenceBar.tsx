interface Props {
  confidence: number;
  animate?: boolean;
}

export default function ConfidenceBar({ confidence, animate = true }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-high to-optimised ${
            animate ? "transition-all duration-700 ease-out" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
