"""Yuán SOR (Smart Order Routing) service — FastAPI + CVXPY + XGBoost.

Two endpoints :

  POST /optimize       — caller passes alpha_slippage explicitly (legacy /
                         demo path). CVXPY only.
  POST /optimize_ml    — caller passes context features ; the XGBoost model
                         predicts alpha_slippage per source, then CVXPY runs
                         on those predictions. Response includes the model
                         version, predicted slippage breakdown, and the top-3
                         feature importances so the UI can explain WHY the
                         allocation looks the way it does.

Convex problem solved by both endpoints :

    minimize  explicit_cost(x) + slippage_cost(x)
    subject to  sum(x) == target_ngn
                x_i <= depth_i              (per-source depth cap)
                x_i <= max_share * target   (max share per source, default 60 %)
                x >= 0

Slippage is modeled as ``alpha_i * quad_over_lin(x_i, depth_i)`` — the
DCP-compliant convex form of ``alpha_i * x_i^2 / depth_i``.

Run :
    pnpm sor:dev      # cd services/sor && uvicorn app:app --reload --port 8000

Train model first :
    pnpm sor:train    # produces services/sor/model.joblib
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import cvxpy as cp
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("sor")

app = FastAPI(title="Yuán SOR Service", version="2.0.0")

MODEL_PATH = Path(__file__).parent / "model.joblib"
_MODEL_BUNDLE: dict[str, Any] | None = None


def get_model_bundle() -> dict[str, Any] | None:
    """Lazy-load the XGBoost bundle on first ML request. Returns None if the
    model file is missing (training has not run yet) — callers should fall
    back to /optimize."""
    global _MODEL_BUNDLE
    if _MODEL_BUNDLE is None and MODEL_PATH.exists():
        log.info("loading XGBoost slippage model from %s", MODEL_PATH)
        _MODEL_BUNDLE = joblib.load(MODEL_PATH)
    return _MODEL_BUNDLE


# ----------------------------- I/O models ---------------------------------- #


class Source(BaseModel):
    source_id: str
    price_ngn_per_usdt: float = Field(..., gt=0)
    spread_bps: float = Field(..., ge=0)
    depth_ngn: float = Field(..., gt=0)
    alpha_slippage: float = Field(
        ...,
        ge=0,
        description="Quadratic slippage coefficient. Higher = source degrades faster as you allocate more to it.",
    )
    delay_seconds: float = Field(default=30.0, ge=0)


class SourceMl(BaseModel):
    """Same as `Source` but without `alpha_slippage` — XGBoost predicts it."""

    source_id: str
    price_ngn_per_usdt: float = Field(..., gt=0)
    spread_bps: float = Field(..., ge=0)
    depth_ngn: float = Field(..., gt=0)
    delay_seconds: float = Field(default=30.0, ge=0)


class MarketContext(BaseModel):
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    is_month_end: int = Field(..., ge=0, le=1)
    ngn_vol_24h: float = Field(..., ge=0)


class OptimizeRequest(BaseModel):
    target_ngn: float = Field(..., gt=0)
    sources: list[Source] = Field(..., min_length=1)
    max_share_per_source: float = Field(default=0.6, gt=0, le=1)


class OptimizeMlRequest(BaseModel):
    target_ngn: float = Field(..., gt=0)
    sources: list[SourceMl] = Field(..., min_length=1)
    context: MarketContext
    max_share_per_source: float = Field(default=0.6, gt=0, le=1)


class Allocation(BaseModel):
    source_id: str
    ngn_amount: float
    share: float
    predicted_slippage_bps: float
    predicted_delay_seconds: float


class FeatureContribution(BaseModel):
    feature: str
    importance: float
    label: str


class OptimizeResponse(BaseModel):
    allocation: list[Allocation]
    total_cost_bps: float
    vs_baseline_savings_bps: float
    solver_status: str
    engine: str = "cvxpy"
    model_version: str | None = None
    top_features: list[FeatureContribution] = Field(default_factory=list)


# ----------------------------- Helpers ------------------------------------- #

# Human-readable labels for the "Why this allocation?" UI panel. Kept in sync
# with services/sor/train.py FEATURES.
_FEATURE_LABEL_KEYS: dict[str, str] = {
    "size_ngn": "size",
    "depth_ngn": "depth",
    "spread_bps": "spread",
    "hour_of_day": "hour",
    "day_of_week": "dow",
    "is_month_end": "monthEnd",
    "ngn_vol_24h": "vol",
    "is_yellow_card": "sourceYellowCard",
    "is_otc_1": "sourceOtc1",
    "is_otc_2": "sourceOtc2",
}


def _solve(
    target_ngn: float,
    spreads_bps: np.ndarray,
    depths_ngn: np.ndarray,
    alphas: np.ndarray,
    delays: np.ndarray,
    source_ids: list[str],
    prices: np.ndarray,
    max_share: float,
) -> tuple[np.ndarray, float, float, str]:
    """Run the convex solve. Returns (x_opt, optimal_cost, baseline_cost, status)."""
    n = len(source_ids)
    x = cp.Variable(n, nonneg=True)
    spreads = spreads_bps / 10_000

    explicit_cost = x @ spreads
    slippage_cost = cp.sum(
        [alphas[i] * cp.quad_over_lin(x[i], depths_ngn[i]) for i in range(n)]
    )

    constraints = [
        cp.sum(x) == target_ngn,
        x <= depths_ngn,
    ]
    if n >= 2 and max_share < 1.0:
        constraints.append(x <= max_share * target_ngn)

    prob = cp.Problem(cp.Minimize(explicit_cost + slippage_cost), constraints)
    try:
        prob.solve(solver=cp.CLARABEL)
    except cp.SolverError as e:
        raise HTTPException(status_code=500, detail=f"Solver failed: {e}") from e

    if prob.status not in ("optimal", "optimal_inaccurate"):
        raise HTTPException(status_code=500, detail=f"Solver status: {prob.status}")

    sorted_idx = sorted(range(n), key=lambda i: prices[i])
    baseline = np.zeros(n)
    if n >= 2:
        baseline[sorted_idx[0]] = max_share * target_ngn
        baseline[sorted_idx[1]] = (1 - max_share) * target_ngn
    else:
        baseline[sorted_idx[0]] = target_ngn
    baseline_cost = float(
        baseline @ spreads
        + sum(alphas[i] * baseline[i] ** 2 / depths_ngn[i] for i in range(n))
    )

    return np.asarray(x.value), float(prob.value), baseline_cost, str(prob.status)


# ----------------------------- Endpoints ----------------------------------- #


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": "sor", "version": "2.0.0"}


@app.get("/model_info")
def model_info() -> dict[str, Any]:
    """Surface the loaded model version + metrics for the UI badge."""
    bundle = get_model_bundle()
    if bundle is None:
        return {"loaded": False}
    return {
        "loaded": True,
        "model_version": bundle["model_version"],
        "metrics": bundle["metrics"],
        "feature_importances": bundle["feature_importances"],
    }


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest) -> OptimizeResponse:
    """CVXPY-only path. Caller passes alpha_slippage explicitly."""
    spreads = np.array([s.spread_bps for s in req.sources])
    depths = np.array([s.depth_ngn for s in req.sources])
    alphas = np.array([s.alpha_slippage for s in req.sources])
    delays = np.array([s.delay_seconds for s in req.sources])
    prices = np.array([s.price_ngn_per_usdt for s in req.sources])
    ids = [s.source_id for s in req.sources]

    x_opt, opt_cost, base_cost, status = _solve(
        req.target_ngn, spreads, depths, alphas, delays, ids, prices, req.max_share_per_source
    )
    target = req.target_ngn

    return OptimizeResponse(
        allocation=[
            Allocation(
                source_id=ids[i],
                ngn_amount=float(x_opt[i]),
                share=float(x_opt[i] / target),
                predicted_slippage_bps=float(alphas[i] * x_opt[i] / depths[i] * 10_000),
                predicted_delay_seconds=float(delays[i]),
            )
            for i in range(len(ids))
        ],
        total_cost_bps=opt_cost / target * 10_000,
        vs_baseline_savings_bps=(base_cost - opt_cost) / target * 10_000,
        solver_status=status,
        engine="cvxpy",
    )


@app.post("/optimize_ml", response_model=OptimizeResponse)
def optimize_ml(req: OptimizeMlRequest) -> OptimizeResponse:
    """ML-calibrated path. XGBoost predicts alpha_slippage per source from the
    market context, then CVXPY solves on those predicted alphas. This is the
    pipeline described in the original tech design (Feature 6 — SOR ML)."""
    bundle = get_model_bundle()
    if bundle is None:
        raise HTTPException(
            status_code=503,
            detail="XGBoost model not trained yet. Run `pnpm sor:train` first.",
        )
    model = bundle["model"]
    feature_names: list[str] = bundle["feature_names"]
    importances: dict[str, float] = bundle["feature_importances"]

    n = len(req.sources)
    spreads = np.array([s.spread_bps for s in req.sources])
    depths = np.array([s.depth_ngn for s in req.sources])
    delays = np.array([s.delay_seconds for s in req.sources])
    prices = np.array([s.price_ngn_per_usdt for s in req.sources])
    ids = [s.source_id for s in req.sources]

    # Build the feature matrix for the model. The model predicts realized
    # slippage_bps for an order of size `target_ngn / n` on each source as a
    # rough working point ; the convex solver then re-balances. Empirically
    # this is a reliable proxy because slippage is monotonically increasing
    # in size — predictions at the working point preserve the relative ranking
    # of sources, which is what CVXPY needs to allocate correctly.
    working_size_per_source = req.target_ngn / n
    rows: list[list[float]] = []
    for s in req.sources:
        rows.append(
            [
                working_size_per_source,
                s.depth_ngn,
                s.spread_bps,
                req.context.hour_of_day,
                req.context.day_of_week,
                req.context.is_month_end,
                req.context.ngn_vol_24h,
                int(s.source_id == "yellow_card"),
                int(s.source_id == "otc_1"),
                int(s.source_id == "otc_2"),
            ]
        )
    X = np.asarray(rows, dtype=np.float32)
    assert X.shape == (n, len(feature_names)), "feature ordering drift"

    predicted_slippages = model.predict(X).astype(float)  # bps at working size
    # Convert back to alpha so the convex solver can use the same form. From
    # the synthetic DGP : slippage_bps ≈ alpha * (size/depth)^2 * 10000.
    # So alpha = slippage_bps / ((size/depth)^2 * 10000).
    alphas_predicted = np.array(
        [
            predicted_slippages[i]
            / ((working_size_per_source / depths[i]) ** 2 * 10_000)
            for i in range(n)
        ]
    )
    # Hard floor — floating noise can produce sub-eps alphas which break CVXPY.
    alphas_predicted = np.clip(alphas_predicted, a_min=0.1, a_max=None)

    x_opt, opt_cost, base_cost, status = _solve(
        req.target_ngn, spreads, depths, alphas_predicted, delays, ids, prices, req.max_share_per_source
    )
    target = req.target_ngn

    top_features = [
        FeatureContribution(
            feature=name,
            importance=float(imp),
            label=_FEATURE_LABEL_KEYS.get(name, name),
        )
        for name, imp in list(importances.items())[:3]
    ]

    return OptimizeResponse(
        allocation=[
            Allocation(
                source_id=ids[i],
                ngn_amount=float(x_opt[i]),
                share=float(x_opt[i] / target),
                predicted_slippage_bps=float(alphas_predicted[i] * x_opt[i] / depths[i] * 10_000),
                predicted_delay_seconds=float(delays[i]),
            )
            for i in range(n)
        ],
        total_cost_bps=opt_cost / target * 10_000,
        vs_baseline_savings_bps=(base_cost - opt_cost) / target * 10_000,
        solver_status=status,
        engine="xgboost+cvxpy",
        model_version=bundle["model_version"],
        top_features=top_features,
    )
