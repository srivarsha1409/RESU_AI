# app/routes/user.py

from fastapi import APIRouter, UploadFile, Form, HTTPException
from datetime import datetime
from pydantic import BaseModel
import re
import httpx  # ✅ For calling your AI API endpoint
from app.routes.auth_routes import db
from app.routes.resume_routes import process_resume_file

router = APIRouter(prefix="/user", tags=["User Dashboard"])
users = db["users"]
portfolio_collection = db["portfolio"]

# Your AI Chat endpoint (local FastAPI route)
AI_CHAT_URL = "http://127.0.0.1:8000/ai/chat"


# ---------------------------------------------------------------------
# 1️⃣ Fetch user info
# ---------------------------------------------------------------------
@router.get("/info/{email}")
def get_user_info(email: str):
    user = users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "password": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "user": user}


# ---------------------------------------------------------------------
# 2️⃣ Upload Resume → Process + AI Skill Suggestion (Dynamic Role)
# ---------------------------------------------------------------------
@router.post("/upload_resume")
async def upload_resume(email: str = Form(...), file: UploadFile = None):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    try:
        # ✅ Step 1: Process the resume and extract data
        result = await process_resume_file(file)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        structured_info = result.get("data", {})
        ats_score = result.get("ats_score", 0)
        ats_breakdown = result.get("ats_breakdown", {})
        word_count = result.get("word_count", 0)

        # ✅ Step 2: Extract technical skills from resume
        technical_skills = structured_info.get("skills", {}).get("technical", [])
        skills_text = ", ".join(technical_skills) if technical_skills else "None"

        # ✅ Step 3: Dynamically detect role and suggest missing skills
        ai_prompt = (
            f"Analyze this candidate's resume data and determine their most suitable job role "
            f"based on their skills, education, and experience.\n\n"
            f"Resume technical skills: {skills_text}\n\n"
            f"Return the result in the following format strictly:\n"
            f"Role: <predicted role>\n"
            f"Missing Skills: <comma-separated list of 5-8 new or complementary skills>\n\n"
            f"Example:\n"
            f"Role: Data Analyst\n"
            f"Missing Skills: Power BI, SQL, Pandas, Data Visualization, Excel, Tableau"
        )

        detected_role = "Unknown"
        suggested_skills = []

        async with httpx.AsyncClient() as client:
            try:
                ai_response = await client.post(
                    AI_CHAT_URL,
                    json={"query": ai_prompt, "resume_data": structured_info},
                    timeout=30
                )
                if ai_response.status_code == 200:
                    data = ai_response.json()
                    ai_text = data.get("response", "")
                    # ✅ Parse role and skills from AI response
                    if "Role:" in ai_text:
                        parts = ai_text.split("Role:")[1].split("Missing Skills:")
                        detected_role = parts[0].strip() if len(parts) > 0 else "Unknown"
                        if len(parts) > 1:
                            suggested_skills = [s.strip() for s in parts[1].split(",") if s.strip()]
            except Exception as e:
                print("⚠️ AI request failed:", e)
                detected_role = "Unknown"
                suggested_skills = []

        # ✅ Step 4: Save user resume data + AI suggestions + role to MongoDB
        users.update_one(
            {"email": email},
            {
                "$set": {
                    "resume_filename": file.filename,
                    "structured_info": structured_info,
                    "ats_score": ats_score,
                    "ats_breakdown": ats_breakdown,
                    "word_count": word_count,
                    "suggested_skills": suggested_skills,
                    "detected_role": detected_role,
                    "last_uploaded": datetime.utcnow().isoformat(),
                }
            },
            upsert=True,
        )

        # ✅ Step 5: Send response to frontend
        return {
            "status": "success",
            "message": "Resume processed successfully ✅",
            "structured_info": structured_info,
            "ats_score": ats_score,
            "ats_breakdown": ats_breakdown,
            "word_count": word_count,
            "detected_role": detected_role,
            "suggested_skills": suggested_skills,
        }

    except Exception as e:
        print("❌ Error in upload_resume:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# 3️⃣ Fetch ATS + Resume History
# ---------------------------------------------------------------------
@router.get("/history/{email}")
def get_history(email: str):
    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "status": "success",
        "structured_info": user.get("structured_info", {}),
        "ats_score": user.get("ats_score", {}),
        "ats_breakdown": user.get("ats_breakdown", {}),
        "word_count": user.get("word_count", 0),
        "detected_role": user.get("detected_role", "Unknown"),
        "suggested_skills": user.get("suggested_skills", []),
        "last_uploaded": user.get("last_uploaded", None)
    }


# ---------------------------------------------------------------------
# 4️⃣ Admin – List all users
# ---------------------------------------------------------------------
@router.get("/all")
def get_all_users():
    all_users = list(users.find({}, {"_id": 0, "password": 0}))
    return {"status": "success", "users": all_users}


class PortfolioRequest(BaseModel):
    email: str


@router.post("/portfolio")
def generate_portfolio(req: PortfolioRequest):
    user = users.find_one(
        {"email": {"$regex": f"^{req.email}$", "$options": "i"}},
        {"_id": 0},
    )
    if not user or "structured_info" not in user:
        raise HTTPException(status_code=404, detail="No resume data found for this user")

    data = user["structured_info"] or {}
    detected_role = user.get("detected_role", "Software Engineer")

    name = data.get("name") or user.get("name") or req.email.split("@")[0]

    if detected_role and detected_role != "Unknown":
        headline = f"Aspiring {detected_role}"
    else:
        headline = "Aspiring Software Engineer"

    summary = data.get("summary") or (
        "Passionate fresher looking for opportunities in software development, "
        "with a strong foundation in programming and problem solving."
    )

    skills_block = data.get("skills") or {}
    skills = (
        skills_block.get("technical")
        or skills_block.get("tech")
        or []
    )

    raw_projects = data.get("projects") or []
    projects = []
    for p in raw_projects:
        if isinstance(p, dict):
            title = p.get("title") or p.get("name") or "Project"
            desc = p.get("description") or p.get("details") or ""
            tech = p.get("tech_stack") or p.get("technologies") or []
            if isinstance(tech, str):
                tech = [t.strip() for t in tech.split(",") if t.strip()]
            github = p.get("github") or p.get("git_url") or ""
            link = p.get("live_link") or p.get("deployment") or ""
        else:
            title = "Project"
            desc = str(p)
            tech = []
            github = ""
            link = ""

        projects.append(
            {
                "title": title,
                "description": desc,
                "technologies": tech,
                "github": github,
                "link": link,
            }
        )

    contacts = {
        "email": data.get("email") or user.get("email") or req.email,
        "github": data.get("github") or "",
        "linkedin": data.get("linkedin") or "",
        "phone": data.get("phone") or "",
    }

    base_slug = f"{name}-{detected_role}".replace(" ", "-")
    slug = re.sub(r"[^a-zA-Z0-9\-]", "", base_slug).lower()

    portfolio = {
        "name": name,
        "headline": headline,
        "summary": summary,
        "skills": skills[:15],
        "projects": projects[:6],
        "contacts": contacts,
        "role": detected_role,
    }

    portfolio_collection.update_one(
        {"email": req.email},
        {"$set": {"slug": slug, "portfolio": portfolio, "updated_at": datetime.utcnow()}},
        upsert=True,
    )

    return {"slug": slug, "portfolio": portfolio}
