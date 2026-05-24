import type { HealthResponse, Optimization, OptimizationDetail, OptimizationStatus } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function fetchOptimizations(sort = "priority"): Promise<Optimization[]> {
  return request<Optimization[]>(`/api/optimizations?sort=${sort}`);
}

export function fetchOptimization(id: number): Promise<OptimizationDetail> {
  return request<OptimizationDetail>(`/api/optimizations/${id}`);
}

export function patchOptimizationStatus(
  id: number,
  status: OptimizationStatus
): Promise<OptimizationDetail> {
  return request<OptimizationDetail>(`/api/optimizations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function triggerSlowSearch(): Promise<{ count: number }> {
  return request<{ count: number }>("/users/slow-search");
}
