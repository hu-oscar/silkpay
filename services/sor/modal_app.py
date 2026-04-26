"""Yuán SOR — Modal deployment wrapper.

Wraps the FastAPI app + the trained XGBoost model into a Modal serverless
function so production (Vercel) can hit the ML-calibrated /optimize_ml
endpoint without us running uvicorn locally.

Deploy :
    modal deploy services/sor/modal_app.py

The deploy prints the public URL — set it as SOR_SERVICE_URL in Vercel
(production + preview + development).

Cost notes :
  - 512 MB / 1 vCPU is plenty (XGBoost predict + CVXPY solve fit).
  - keep_warm=1 holds one instance hot to avoid cold starts during the demo.
    Drop to keep_warm=0 after the hackathon to push cost to ~0.
"""
from __future__ import annotations

from pathlib import Path

import modal

HERE = Path(__file__).parent

# Build the image : install deps from requirements.txt, then bake the source
# files (app.py + the pre-trained model.joblib) into the image so cold starts
# don't pay for a download. The training script is excluded — production only
# serves the model, it doesn't retrain.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements(str(HERE / "requirements.txt"))
    .add_local_file(HERE / "app.py", remote_path="/root/app.py")
    .add_local_file(HERE / "model.joblib", remote_path="/root/model.joblib")
)

app = modal.App("yuan-sor")


@app.function(
    image=image,
    memory=512,
    timeout=60,
    min_containers=1,  # warm pool of 1 — sub-50 ms inference on hits
)
@modal.asgi_app()
def fastapi_app():
    """Expose the FastAPI app with both /optimize and /optimize_ml endpoints."""
    import sys

    sys.path.insert(0, "/root")
    from app import app as fastapi_instance

    return fastapi_instance
