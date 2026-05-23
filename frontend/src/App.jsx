import { useCallback, useEffect, useState } from "react";
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

function ListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("priority");
  const [demoStatus, setDemoStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOptimizations(sort);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

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

  return (
    <div className="container">
      <div className="actions" style={{ marginBottom: "1rem" }}>
        <button onClick={runDemo}>Trigger slow query demo</button>
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
          Refresh
        </button>
      </div>
      {demoStatus && <p className="meta">{demoStatus}</p>}
      {loading && <p className="meta">Loading...</p>}
      {!loading && items.length === 0 && (
        <div className="empty">
          <p>No optimizations yet.</p>
          <p>Click &quot;Trigger slow query demo&quot; to generate one.</p>
        </div>
      )}
      {items.map((item) => (
        <Link key={item.id} to={`/optimization/${item.id}`}>
          <div className="card">
            <span className={`badge ${item.status}`}>{item.status}</span>
            <span className="badge">{item.duration_ms.toFixed(0)} ms</span>
            {item.priority_score != null && (
              <span className="badge">priority {item.priority_score.toFixed(1)}</span>
            )}
            {item.estimated_savings_ms != null && (
              <span className="badge">~{item.estimated_savings_ms.toFixed(0)} ms saved</span>
            )}
            <p style={{ margin: "0.5rem 0 0" }}>{item.root_cause}</p>
            <p className="meta">
              {item.route} · confidence {(item.confidence * 100).toFixed(0)}% ·{" "}
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOptimization(id)
      .then(setItem)
      .catch(() => setError("Could not load optimization"));
  }, [id]);

  if (error) return <div className="container"><p>{error}</p></div>;
  if (!item) return <div className="container"><p className="meta">Loading...</p></div>;

  return (
    <div className="container">
      <p className="meta">
        <Link to="/">← Back to list</Link>
      </p>
      <h2>Optimization #{item.id}</h2>
      <p>
        <span className={`badge ${item.status}`}>{item.status}</span>
        <span className="badge">{item.duration_ms.toFixed(0)} ms original</span>
        <span className="badge">confidence {(item.confidence * 100).toFixed(0)}%</span>
      </p>
      <h3>Root cause</h3>
      <p>{item.root_cause}</p>
      <h3>SQL diff</h3>
      <div className="diff-grid">
        <div>
          <h4>Original</h4>
          <pre className="sql-block">{item.sql_text}</pre>
        </div>
        <div>
          <h4>Optimized</h4>
          <pre className="sql-block">{item.optimized_sql}</pre>
        </div>
      </div>
      <div className="actions">
        <button onClick={() => copyText(item.sql_text)}>Copy original SQL</button>
        <button onClick={() => copyText(item.optimized_sql)}>Copy optimized SQL</button>
        <button
          className="danger"
          onClick={async () => {
            await dismissOptimization(item.id);
            setItem({ ...item, status: "dismissed" });
          }}
        >
          Dismiss
        </button>
      </div>
      <h3>Index suggestions</h3>
      {(item.index_suggestions || []).length === 0 ? (
        <p className="meta">No index suggestions.</p>
      ) : (
        <ul className="index-list">
          {item.index_suggestions.map((ddl, i) => (
            <li key={i}>
              {ddl}
              <button
                className="secondary"
                style={{ marginLeft: "0.5rem", padding: "0.25rem 0.5rem" }}
                onClick={() => copyText(ddl)}
              >
                Copy
              </button>
            </li>
          ))}
        </ul>
      )}
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
