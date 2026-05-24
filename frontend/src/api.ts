import type { HealthResponse, Optimization, OptimizationDetail, OptimizationStatus } from "./types";

/** Empty in dev (Vite proxy). Production: env at build time, or default Render API URL. */
const PROD_API_DEFAULT = "https://ai-powered-database-query-optimiser.onrender.com";
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.PROD ? PROD_API_DEFAULT : "")
).replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>(apiUrl("/health"));
}

export function fetchOptimizations(sort = "priority"): Promise<Optimization[]> {
  return request<Optimization[]>(apiUrl(`/api/optimizations?sort=${sort}`));
}

export function fetchOptimization(id: number): Promise<OptimizationDetail> {
  return request<OptimizationDetail>(apiUrl(`/api/optimizations/${id}`));
}

export function patchOptimizationStatus(
  id: number,
  status: OptimizationStatus
): Promise<OptimizationDetail> {
  return request<OptimizationDetail>(apiUrl(`/api/optimizations/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function triggerSlowSearch(): Promise<{ count: number }> {
  return request<{ count: number }>(apiUrl("/users/slow-search"));
}
