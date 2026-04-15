from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict

from app.helpers.guidance_helper import generate_guidance


router = APIRouter(prefix="/guidance", tags=["Guidance"])


class GuidanceRequest(BaseModel):
    resume_data: Dict[str, Any]


@router.post("/generate")
async def generate_guidance_endpoint(payload: GuidanceRequest):
    """Generate LLM-based career guidance for a student's resume.

    Expects structured resume data (same as structured_info) in the body.
    Returns a structured guidance object.
    """
    if not payload.resume_data:
        raise HTTPException(status_code=400, detail="resume_data is required")

    result = await generate_guidance(payload.resume_data)

    if not isinstance(result, dict):
        raise HTTPException(status_code=500, detail="Invalid guidance response")

    return {"guidance": result}
