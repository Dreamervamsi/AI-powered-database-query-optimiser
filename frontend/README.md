# DB Query Optimizer — Frontend

Judge demo dashboard for slow-query capture, AI root-cause analysis, and one-click “Apply index”.

## Quick start

**Terminal 1 — API**
```bash
cd ..
.venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 2 — UI**
```bash
npm install
npm run dev
```

Open http://localhost:5173

## 3-minute demo script

1. Confirm green **Interceptor live** (polls `/health`).
2. Click **Simulate slow query** → row appears with **Analyzing** → spinner on the right.
3. Within ~10–30s, AI completes → **Root cause** fades in, confidence bar fills, before/after cards show.
4. Click **Apply index** → badge flips to **Optimised** (PATCH `reviewed`; no real DDL).

## Stack

Vite, React 18, TypeScript, Tailwind CSS. Dev proxy forwards `/api`, `/health`, `/users` to `http://127.0.0.1:8000`.
