# Yuán SOR Service

Local FastAPI + CVXPY solver for cross-source NGN→USDT allocation.

## Quickstart

```bash
# From repo root, after services/sor/.venv is created:
services/sor/.venv/bin/pip install -r services/sor/requirements.txt

# Run dev server (port 8000):
pnpm sor:dev
# or:
cd services/sor && .venv/bin/uvicorn app:app --reload --port 8000

# Run tests:
pnpm test:sor
# or:
cd services/sor && .venv/bin/pytest -q
```

Endpoints:
- `GET /health` — liveness probe
- `POST /optimize` — *(Phase 4)* solve the allocation problem
