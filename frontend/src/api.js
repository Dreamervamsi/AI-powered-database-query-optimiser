const API_BASE = "";

export async function fetchOptimizations(sort = "priority") {
  const res = await fetch(`${API_BASE}/api/optimizations?sort=${sort}`);
  if (!res.ok) throw new Error("Failed to load optimizations");
  return res.json();
}

export async function fetchOptimization(id) {
  const res = await fetch(`${API_BASE}/api/optimizations/${id}`);
  if (!res.ok) throw new Error("Failed to load optimization");
  return res.json();
}

export async function dismissOptimization(id) {
  const res = await fetch(`${API_BASE}/api/optimizations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "dismissed" }),
  });
  if (!res.ok) throw new Error("Failed to dismiss");
  return res.json();
}

export async function triggerSlowDemo() {
  const res = await fetch(`${API_BASE}/users/slow-search`);
  if (!res.ok) throw new Error("Demo request failed");
  return res.json();
}
