"""Yuán SOR (Smart Order Routing) service — local FastAPI + CVXPY.

Solves the convex allocation problem:
    minimize  explicit_cost(x) + slippage_cost(x)
    subject to  sum(x) == target_ngn
                x_i <= depth_i        (per-source depth cap)
                x_i <= 0.6 * target   (max share per source)
                x >= 0

Scaffold endpoint only at Phase 0 — full implementation lands in Phase 4.
"""
from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="Yuan SOR Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "sor", "version": "0.1.0"}
