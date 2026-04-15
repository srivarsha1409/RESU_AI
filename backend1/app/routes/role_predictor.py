# app/routes/role_predictor.py
import os
import asyncio
from typing import List, Optional, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(tags=["AI Role Prediction"])

HUGGINGFACE_MODEL = "bhadresh-savani/distilbert-base-uncased-emotion"
# Use the new HuggingFace inference router endpoint
HUGGINGFACE_API_URL = f"https://router.huggingface.co/hf-inference/models/{HUGGINGFACE_MODEL}"
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

# Map model labels -> fresher roles
ROLE_MAP: Dict[str, List[str]] = {
    "technology": ["Software Engineer - Fresher", "Full Stack Developer - Fresher"],
    "programming": ["Backend Developer - Fresher"],
    "creativity": ["UI/UX Designer - Fresher"],
    "analysis": ["Data Analyst - Fresher"],
    "learning": ["Machine Learning Intern"],
    "organization": ["Business Analyst - Fresher"],
    "responsibility": ["Cybersecurity Analyst - Fresher"],
}


class PredictRoleRequest(BaseModel):
    # Spec: {"inputs": "<resume text>"}
    inputs: str = Field(..., description="Combined resume text: skills + summary")


class PredictRoleResponse(BaseModel):
    predicted_label: str
    recommended_roles: List[str]
    confidence: float  # 0.0–1.0


async def _call_hf_api(
    text: str,
    max_retries: int = 2,
    timeout: float = 6.0,
) -> List[Dict[str, Any]]:
    """Call HuggingFace Inference API with retries and low-latency settings.

    If the configured token does not have sufficient permissions for Inference Providers
    (HTTP 403 with the specific error message), automatically retry *once* without
    Authorization header, falling back to public access.
    """
    base_headers = {"Content-Type": "application/json"}
    auth_headers = base_headers.copy()
    if HUGGINGFACE_API_KEY:
        auth_headers["Authorization"] = f"Bearer {HUGGINGFACE_API_KEY}"

    payload = {"inputs": text}

    last_error: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(max_retries + 1):
            try:
                # First try with auth (if available)
                headers_to_use = auth_headers if HUGGINGFACE_API_KEY else base_headers
                res = await client.post(HUGGINGFACE_API_URL, headers=headers_to_use, json=payload)

                # If token lacks permissions, retry once without auth
                if (
                    res.status_code == 403
                    and "does not have sufficient permissions" in res.text
                ):
                    # Retry immediately without Authorization header
                    res = await client.post(HUGGINGFACE_API_URL, headers=base_headers, json=payload)

                if res.status_code == 503:
                    # Model loading on HF side
                    last_error = HTTPException(
                        status_code=503,
                        detail="Model is loading, please retry shortly.",
                    )
                elif res.status_code >= 400:
                    last_error = HTTPException(
                        status_code=res.status_code,
                        detail=f"HuggingFace error: {res.text}",
                    )
                else:
                    data = res.json()
                    # Expected: [[{"label": "...", "score": 0.123}, ...]]
                    if isinstance(data, list) and data and isinstance(data[0], list):
                        return data[0]
                    if isinstance(data, list):
                        return data
                    last_error = HTTPException(
                        status_code=500,
                        detail=f"Unexpected HuggingFace response: {data}",
                    )

            except Exception as e:
                last_error = e

            if attempt < max_retries:
                await asyncio.sleep(0.5)

    if isinstance(last_error, HTTPException):
        raise last_error
    raise HTTPException(status_code=500, detail=str(last_error) if last_error else "Unknown HF error")


def _map_label_to_roles(label: str) -> List[str]:
    key = label.lower().strip()
    return ROLE_MAP.get(key, [])


@router.post("/predict-role", response_model=PredictRoleResponse)
async def predict_role(payload: PredictRoleRequest):
    """AI-based fresher job role predictor using HuggingFace model with safe fallback.

    If the remote HuggingFace call fails (401/403 or other errors), we fall back to a
    simple keyword-based heuristic on the input text to still provide fresher roles.
    """
    text = (payload.inputs or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="inputs field must not be empty")

    # Latency optimization: truncate very long texts
    if len(text) > 2000:
        text = text[:2000]

    predictions: List[Dict[str, Any]] = []
    try:
        predictions = await _call_hf_api(text)
    except HTTPException:
        # Ignore remote errors and rely on local heuristic below
        predictions = []

    label: str
    score: float

    if predictions:
        top_pred = max(predictions, key=lambda p: p.get("score", 0.0))
        label = str(top_pred.get("label", "unknown"))
        score = float(top_pred.get("score", 0.0))
    else:
        # Local heuristic fallback: infer a label from keywords in the text
        lowered = text.lower()
        if any(kw in lowered for kw in ["react", "angular", "vue", "frontend"]):
            label = "technology"
        elif any(kw in lowered for kw in ["python", "java", "node", "backend", "api"]):
            label = "programming"
        elif any(kw in lowered for kw in ["ui", "ux", "figma", "design"]):
            label = "creativity"
        elif any(kw in lowered for kw in ["data", "analysis", "excel", "power bi", "sql"]):
            label = "analysis"
        elif any(kw in lowered for kw in ["ml", "machine learning", "deep learning", "tensorflow", "pytorch"]):
            label = "learning"
        elif any(kw in lowered for kw in ["business", "requirements", "stakeholder"]):
            label = "organization"
        elif any(kw in lowered for kw in ["security", "cyber", "vulnerability", "network"]):
            label = "responsibility"
        else:
            label = "technology"
        score = 0.5

    roles = _map_label_to_roles(label)
    fresher_roles = [r for r in roles if "Fresher" in r or "Intern" in r]

    return PredictRoleResponse(
        predicted_label=label,
        recommended_roles=fresher_roles,
        confidence=score,
    )
