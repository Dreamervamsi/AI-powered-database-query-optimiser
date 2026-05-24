# DB Query Optimizer — Frontend

React dashboard for slow-query capture, AI analysis results, and marking optimizations as reviewed.

## Prerequisites

Backend on Render or locally (see root [README.md](../README.md)).

**Live app:** https://ai-powered-database-query-optimiser-1.onrender.com  
**API:** https://ai-powered-database-query-optimiser.onrender.com

`frontend/.env.development` points the Vite proxy at the API. For a **local** API instead, set:

```env
VITE_API_TARGET=http://127.0.0.1:8000
```

On the **API** Render service, set **`CORS_ORIGINS`** to:

```text
https://ai-powered-database-query-optimiser-1.onrender.com,http://localhost:5173,http://127.0.0.1:5173
```

Redeploy the API after saving. Without this, the live dashboard cannot call the API.

## Quick start

**UI only** (uses Render API via proxy):

```bash
npm install
npm run dev
```

**Or: local API + UI** — Terminal 1 (repo root):

```bash
.venv\Scripts\activate
python main.py
```

Set `VITE_API_TARGET=http://127.0.0.1:8000` in `.env.development`, then **Terminal 2** (this folder):

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
- Dev server proxies `/api`, `/health`, and `/users` to `VITE_API_TARGET` (`vite.config.ts`, default `http://127.0.0.1:8000`)

## Deploy on Render (static site)

1. **New** → **Static Site** → connect this repo.
2. **Root directory**: `frontend`
3. **Build**: `npm install && npm run build`
4. **Publish directory**: `dist`
5. **Environment** (required at build time):
   ```
   VITE_API_BASE_URL=https://ai-powered-database-query-optimiser.onrender.com
   ```
6. After deploy, copy your site URL (e.g. `https://db-opt-frontend.onrender.com`).
7. On the **API** web service → **Environment** → add that URL to **`CORS_ORIGINS`** (comma-separated with localhost if you still develop locally), then redeploy the API.

Or add the `db-opt-frontend` service from root `render.yaml` (Blueprint).

## Build

```bash
npm run build
npm run preview
```

Production builds read `VITE_API_BASE_URL` from `.env.production`.
