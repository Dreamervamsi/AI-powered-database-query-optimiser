interface Props {
  live: boolean;
  thresholdMs?: number;
}

export default function InterceptorStatus({ live, thresholdMs }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          live ? "bg-optimised animate-pulseDot" : "bg-gray-500"
        }`}
        aria-hidden
      />
      <span className={live ? "text-optimised font-medium" : "text-gray-400"}>
        {live ? "Interceptor live" : "Interceptor offline"}
      </span>
      {live && thresholdMs != null && (
        <span className="text-gray-500 text-xs">({thresholdMs}ms threshold)</span>
      )}
    </div>
  );
}
