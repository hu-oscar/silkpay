"""Yuán SOR (Smart Order Routing) service — local FastAPI + CVXPY.

Solves the convex allocation problem :

    minimize  explicit_cost(x) + slippage_cost(x)
    subject to  sum(x) == target_ngn
                x_i <= depth_i              (per-source depth cap)
                x_i <= max_share * target   (max share per source, default 60 %)
                x >= 0

Slippage is modeled as ``alpha_i * quad_over_lin(x_i, depth_i)``, which is the
DCP-compliant convex form of ``alpha_i * x_i**2 / depth_i``. This approximates
linear-impact price impact (cost grows quadratically with size relative to
available depth) while staying inside CVXPY's disciplined-convex grammar — the
ECOS solver can then guarantee a global optimum.

Run with :
    pnpm sor:dev
        # which is equivalent to:
        cd services/sor && .venv/bin/uvicorn app:app --reload --port 8000

Tests :
    pnpm test:sor
"""
from __future__ import annotations

import logging

import cvxpy as cp
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("sor")

app = FastAPI(title="Yuán SOR Service", version="1.0.0")


# ----------------------------- I/O models ---------------------------------- #


class Source(BaseModel):
    source_id: str
    price_ngn_per_usdt: float = Field(..., gt=0)
    spread_bps: float = Field(..., ge=0)
    depth_ngn: float = Field(..., gt=0)
    alpha_slippage: float = Field(
        ..., ge=0,
        description="Quadratic slippage coefficient. Higher = source degrades faster as you allocate more to it.",
    )
    delay_seconds: float = Field(default=30.0, ge=0)


class OptimizeRequest(BaseModel):
    target_ngn: float = Field(..., gt=0)
    sources: list[Source] = Field(..., min_length=1)
    max_share_per_source: float = Field(default=0.6, gt=0, le=1)


class Allocation(BaseModel):
    source_id: str
    ngn_amount: float
    share: float
    predicted_slippage_bps: float
    predicted_delay_seconds: float


class OptimizeResponse(BaseModel):
    allocation: list[Allocation]
    total_cost_bps: float
    vs_baseline_savings_bps: float
    solver_status: str


# ----------------------------- Endpoints ----------------------------------- #


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "sor", "version": "1.0.0"}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest) -> OptimizeResponse:
    """Solve the allocation problem and return per-source NGN amounts."""
    n = len(req.sources)
    x = cp.Variable(n, nonneg=True)

    spreads = np.array([s.spread_bps / 10_000 for s in req.sources])
    depths = np.array([s.depth_ngn for s in req.sources])
    alphas = np.array([s.alpha_slippage for s in req.sources])

    explicit_cost = x @ spreads
    slippage_cost = cp.sum(
        [alphas[i] * cp.quad_over_lin(x[i], depths[i]) for i in range(n)]
    )

    constraints = [
        cp.sum(x) == req.target_ngn,
        x <= depths,
    ]
    # max_share cap only makes sense with multiple sources — with one source
    # the constraint would be infeasible (sum=target requires the single source
    # to take 100%, but cap is < 100%).
    if n >= 2 and req.max_share_per_source < 1.0:
        constraints.append(x <= req.max_share_per_source * req.target_ngn)

    prob = cp.Problem(cp.Minimize(explicit_cost + slippage_cost), constraints)
    # CLARABEL handles the large-NGN × small-bps conditioning better than ECOS
    # for this problem (ECOS hits user_limit / inaccurate on 50M+ targets).
    try:
        prob.solve(solver=cp.CLARABEL)
    except cp.SolverError as e:
        raise HTTPException(status_code=500, detail=f"Solver failed: {e}")

    if prob.status not in ("optimal", "optimal_inaccurate"):
        raise HTTPException(status_code=500, detail=f"Solver status: {prob.status}")

    # Baseline = greedy 60/40 across the two cheapest sources by sticker price.
    # We compute it the same way (closed-form) so the savings number is honest.
    sorted_idx = sorted(range(n), key=lambda i: req.sources[i].price_ngn_per_usdt)
    baseline = np.zeros(n)
    if n >= 2:
        baseline[sorted_idx[0]] = req.max_share_per_source * req.target_ngn
        baseline[sorted_idx[1]] = (1 - req.max_share_per_source) * req.target_ngn
    else:
        baseline[sorted_idx[0]] = req.target_ngn
    baseline_cost = float(
        baseline @ spreads
        + sum(alphas[i] * baseline[i] ** 2 / depths[i] for i in range(n))
    )

    optimal_cost = float(prob.value)
    target = req.target_ngn

    return OptimizeResponse(
        allocation=[
            Allocation(
                source_id=req.sources[i].source_id,
                ngn_amount=float(x.value[i]),
                share=float(x.value[i] / target),
                predicted_slippage_bps=float(
                    alphas[i] * x.value[i] / depths[i] * 10_000
                ),
                predicted_delay_seconds=req.sources[i].delay_seconds,
            )
            for i in range(n)
        ],
        total_cost_bps=optimal_cost / target * 10_000,
        vs_baseline_savings_bps=(baseline_cost - optimal_cost) / target * 10_000,
        solver_status=str(prob.status),
    )
