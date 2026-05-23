import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import {
  dismissOptimization,
  fetchOptimization,
  fetchOptimizations,
  triggerSlowDemo,
} from "./api";

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildChartPath(data, width, height, accessor) {
  if (!data.length) return "";
  const values = data.map(accessor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * (height - 16) - 8;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function LiveChart({ title, values, color, unit }) {
  const width = 520;
  const height = 180;
  const path = buildChartPath(values, width, height, (item) => item.value);
  const latest = values[values.length - 1]?.value ?? 0;

  return (
    <div className="telemetry-card">
      <div className="telemetry-header">
        <div>
          <h3>{title}</h3>
          <p className="meta">Latest: {Math.round(latest)}{unit}</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart">
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <g className="chart-grid">
          {[1, 2, 3].map((row) => (
            <line
              key={row}
              x1="0"
              y1={(height / 4) * row}
              x2={width}
              y2={(height / 4) * row}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function ListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("priority");
  const [demoStatus, setDemoStatus] = useState("");
  const [livePoints, setLivePoints] = useState(() =>
    Array.from({ length: 18 }, (_, index) => ({
      value: 90 + Math.random() * 60,
      time: index * 5000,
    }))
  );
  const [loadPoints, setLoadPoints] = useState(() =>
    Array.from({ length: 18 }, (_, index) => ({
      value: 28 + Math.random() * 18,
      time: index * 5000,
    }))
  );
  const [successToast, setSuccessToast] = useState("");

  const appliedOptimization = useMemo(
    () => Boolean(localStorage.getItem("appliedOptimization")),
    [successToast]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOptimizations(sort);
      setItems(data);
      if (appliedOptimization) {
        setSuccessToast("Optimizations are reflected in live telemetry.");
        setTimeout(() => setSuccessToast(""), 2400);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sort, appliedOptimization]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      const baseline = items.length ? Math.max(...items.map((item) => item.duration_ms)) : 120;
      const targetLatency = appliedOptimization ? 60 : clamp(baseline * 0.9 + Math.random() * 20, 60, 380);
      const targetLoad = appliedOptimization ? clamp(20 + items.length * 2 + Math.random() * 10, 20, 60) : clamp(30 + items.length * 5 + Math.random() * 12, 30, 92);

      setLivePoints((prev) => [...prev.slice(1), { value: targetLatency, time: Date.now() }]);
      setLoadPoints((prev) => [...prev.slice(1), { value: targetLoad, time: Date.now() }]);
    }, 3000);
    return () => clearInterval(interval);
  }, [items.length, appliedOptimization]);

  async function runDemo() {
    setDemoStatus("Running slow query...");
    try {
      await triggerSlowDemo();
      setDemoStatus("Slow query sent. Analysis may take a few seconds...");
      setTimeout(load, 3000);
    } catch {
      setDemoStatus("Demo failed. Is the API running on port 8000?");
    }
  }

  const alertCount = items.filter((item) => item.status !== "dismissed").length;
  const topAlert = items[0];

  return (
    <div className="container">
      <div className="dashboard-grid">
        <div className="dashboard-panel highlight-panel">
          <h3>Action Center</h3>
          <p className="meta">
            When a slow query spikes, the AI alert appears and the dashboard updates with the simulated performance recovery.
          </p>
          <div className="alert-card small">
            <strong>{alertCount} active alert{alertCount === 1 ? "" : "s"}</strong>
            <p>{topAlert ? topAlert.root_cause : "No slow queries detected yet."}</p>
          </div>
          <button onClick={runDemo}>Trigger slow query demo</button>
          <button className="secondary" onClick={load}>Refresh data</button>
          {successToast && <div className="toast success-toast">{successToast}</div>}
        </div>
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Live Performance Feed</h2>
              <p className="meta">Query latency and total database load update every few seconds.</p>
            </div>
            <div className="status-chip">AI Alerts: {alertCount}</div>
          </div>
          <div className="chart-row">
            <LiveChart title="Query Latency over Time" values={livePoints} color="#68d391" unit=" ms" />
            <LiveChart title="Total Database Load" values={loadPoints} color="#63b3ed" unit=" %" />
          </div>
        </div>
      </div>
      <div className="actions" style={{ marginBottom: "1rem" }}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: "6px", background: "#1a2332", color: "#e7ecf3", border: "1px solid #2a3441" }}
        >
          <option value="priority">Sort by priority</option>
          <option value="confidence">Sort by confidence</option>
          <option value="created_at">Sort by newest</option>
        </select>
        <button className="secondary" onClick={load}>
          Refresh list
        </button>
      </div>
      {demoStatus && <p className="meta">{demoStatus}</p>}
      {loading && <p className="meta">Loading...</p>}
      {!loading && items.length === 0 && (
        <div className="empty">
          <p>No optimizations yet.</p>
          <p>Use the action center above to create a demo slow query.</p>
        </div>
      )}
      {items.map((item) => (
        <Link key={item.id} to={`/optimization/${item.id}`}>
          <div className="card alert-card">
            <div className="card-row">
              <span className={`badge ${item.status}`}>{item.status}</span>
              <span className="badge">{item.duration_ms.toFixed(0)} ms</span>
              {item.priority_score != null && (
                <span className="badge">priority {item.priority_score.toFixed(1)}</span>
              )}
              {item.estimated_savings_ms != null && (
                <span className="badge">~{item.estimated_savings_ms.toFixed(0)} ms saved</span>
              )}
            </div>
            <p style={{ margin: "0.5rem 0 0" }}>{item.root_cause}</p>
            <p className="meta">
              {item.route || "unknown route"} · confidence {(item.confidence * 100).toFixed(0)}% · {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function renderPlanTree(sql) {
  const query = sql.toLowerCase();
  const hasJoin = query.includes(" join ");
  const nodes = hasJoin
    ? [
        { label: "Hash Join", children: [
          { label: "Seq Scan on users" },
          { label: "Index Scan on orders" },
        ] },
      ]
    : [{ label: "Seq Scan on data", children: [{ label: "Filter: WHERE" }] }];

  return (
    <div className="plan-tree">
      {nodes.map((node, index) => (
        <div key={index} className="tree-node">
          <div className="tree-label">{node.label}</div>
          {node.children && (
            <div className="tree-children">
              {node.children.map((child, ci) => (
                <div key={ci} className="tree-node child">
                  <div className="tree-label">{child.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionApplied, setActionApplied] = useState(false);

  const appliedKey = `applied_optimization_${id}`;

  useEffect(() => {
    if (localStorage.getItem(appliedKey)) {
      setActionApplied(true);
    }
  }, [appliedKey]);

  useEffect(() => {
    fetchOptimization(id)
      .then(setItem)
      .catch(() => setError("Could not load optimization"));
  }, [id]);

  if (error) return <div className="container"><p>{error}</p></div>;
  if (!item) return <div className="container"><p className="meta">Loading...</p></div>;

  const estimatedAfter = item.estimated_savings_ms
    ? Math.max(10, item.duration_ms - item.estimated_savings_ms)
    : Math.max(10, item.duration_ms * 0.25);
  const recommendation = item.index_suggestions.length > 0 ? item.index_suggestions[0] : item.optimized_sql;

  function handleApply() {
    localStorage.setItem(appliedKey, "true");
    setActionApplied(true);
    setSuccessMessage("Optimization applied successfully. Charts updated.");
    setTimeout(() => setSuccessMessage(""), 2800);
  }

  return (
    <div className="container">
      <p className="meta">
        <Link to="/">← Back to dashboard</Link>
      </p>
      <h2>Slow Query Detective</h2>
      <div className="split-view">
        <div className="panel">
          <h3>The Problem</h3>
          <p className="meta">Captured query and execution shape for the slow query.</p>
          <div className="card">
            <h4>Raw SQL</h4>
            <pre className="sql-block">{item.sql_text}</pre>
          </div>
          <div className="card">
            <h4>EXPLAIN plan</h4>
            {renderPlanTree(item.sql_text)}
          </div>
        </div>
        <div className="panel">
          <h3>AI Analysis</h3>
          <div className="markdown-card">
            <h4>Diagnosis</h4>
            <p>{item.root_cause}</p>
            <h4>The Fix</h4>
            <pre className="sql-block">{recommendation}</pre>
            <h4>Performance Impact</h4>
            <div className="impact-grid">
              <div>
                <span className="impact-label">Before</span>
                <div className="impact-value">{item.duration_ms.toFixed(0)} ms</div>
              </div>
              <div>
                <span className="impact-label">After</span>
                <div className="impact-value">{estimatedAfter.toFixed(0)} ms</div>
              </div>
            </div>
            <button disabled={actionApplied} onClick={handleApply}>
              {actionApplied ? "Optimization Applied" : "Apply Optimization"}
            </button>
            {successMessage && <div className="toast success-toast">{successMessage}</div>}
          </div>
          <div className="actions" style={{ marginTop: "1rem" }}>
            <button onClick={() => copyText(item.sql_text)}>Copy original SQL</button>
            <button onClick={() => copyText(recommendation)}>Copy recommended fix</button>
            <button
              className="secondary"
              onClick={async () => {
                await dismissOptimization(item.id);
                setItem({ ...item, status: "dismissed" });
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>DB Query Optimizer</h1>
        <Link to="/">Dashboard</Link>
      </header>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/optimization/:id" element={<DetailPage />} />
      </Routes>
    </>
  );
}
