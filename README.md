# AI-Powered Database Query Optimizer

Monitors PostgreSQL queries from a FastAPI app, detects slow queries (>500ms by default), runs `EXPLAIN ANALYZE`, sends context to GROQ, and surfaces optimization suggestions in a dashboard.

## Prerequisites

- Python 3.11+
- PostgreSQL with the `data` table (see `models/user.py`)
- Node.js 18+ (for dashboard)
- GROQ API key (optional — mock analysis runs without it)

## Setup

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy environment file and edit values:

```bash
copy .env.example .env
```

Set `GROQ_API_KEY` in `.env`, or leave it blank for mock analysis.

3. Start the API:

```bash
python main.py
```

4. Start the dashboard (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Trigger a slow query (demo)

```bash
curl http://127.0.0.1:8000/users/slow-search
```

Wait a few seconds, then open the dashboard or:

```bash
curl http://127.0.0.1:8000/api/optimizations
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/optimizations` | List optimizations (`?sort=priority\|confidence\|created_at`) |
| GET | `/api/optimizations/{id}` | Detail with original vs optimized SQL |
| PATCH | `/api/optimizations/{id}` | Update status (`pending`, `dismissed`, `reviewed`) |
| POST | `/api/optimizations/analyze` | Manually queue analysis |

## Architecture

1. SQLAlchemy event listeners time every query
2. Queries over the threshold enqueue background analysis
3. Analyzer runs EXPLAIN + schema fetch → GROQ → parse → save
4. React dashboard reads the REST API

## Tests

```bash
pip install pytest
pytest tests/
```

## Security notes

- Only `SELECT` queries are analyzed
- Index DDL is copy-only (not auto-applied)
- Never commit `.env` with real credentials
