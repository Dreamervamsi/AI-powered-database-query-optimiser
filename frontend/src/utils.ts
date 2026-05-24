export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function truncateSql(sql: string, max = 72): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "...";
}

const ROUTE_LABELS: Record<string, string> = {
  "/users/slow-search": "demo/slow-search",
  "/users/{email}": "users.py",
};

export function formatRoute(route: string | null): string {
  if (!route) return "unknown";
  return ROUTE_LABELS[route] ?? route.replace(/^\//, "").replace(/\//g, ".");
}
