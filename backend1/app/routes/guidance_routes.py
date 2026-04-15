from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.helpers.guidance_helper import generate_guidance, generate_role_roadmap


router = APIRouter(prefix="/guidance", tags=["Guidance"])


class GuidanceRequest(BaseModel):
    resume_data: Dict[str, Any]


class RoleRoadmapRequest(BaseModel):
    target_role: str
    current_skills: List[str]
    experience_level: Optional[str] = "fresher"


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


@router.post("/role-roadmap")
async def generate_role_roadmap_endpoint(payload: RoleRoadmapRequest):
    """Generate a personalized learning roadmap for a specific role.
    
    Compares current skills with role requirements and provides
    a step-by-step learning path with projects.
    """
    if not payload.target_role:
        raise HTTPException(status_code=400, detail="target_role is required")

    result = await generate_role_roadmap(
        target_role=payload.target_role,
        current_skills=payload.current_skills or [],
        experience_level=payload.experience_level or "fresher"
    )

    if not isinstance(result, dict):
        raise HTTPException(status_code=500, detail="Invalid roadmap response")

    return {"roadmap": result}
