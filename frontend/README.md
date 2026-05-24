# DB Query Optimizer — Frontend

React dashboard for slow-query capture, AI analysis results, and marking optimizations as reviewed.

## Prerequisites

Backend running on http://127.0.0.1:8000 (see root [README.md](../README.md)).

## Quick start

**Terminal 1 — API** (from repo root):

```bash
.venv\Scripts\activate
python main.py
```

**Terminal 2 — UI** (this folder):

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Using the dashboard

1. **Interceptor live** — polls `/health` for API status and slow-query threshold.
2. **Simulate slow query** — calls `GET /users/slow-search`; a row appears while analysis runs.
3. When analysis finishes, select a row to see root cause, confidence, and before/after SQL.
4. **Apply index** — marks the item as `reviewed` via PATCH (no DDL is run on the database).

## Stack

- Vite, React 18, TypeScript, Tailwind CSS
- Dev server proxies `/api`, `/health`, and `/users` to `http://127.0.0.1:8000` (`vite.config.ts`)

## Build

```bash
npm run build
npm run preview
```
