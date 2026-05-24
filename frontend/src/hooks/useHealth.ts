import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "../api";
import type { HealthResponse } from "../types";

export function useHealth(intervalMs = 10000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setLive(data.status === "ok");
    } catch {
      setHealth(null);
      setLive(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { health, live, refresh };
}
