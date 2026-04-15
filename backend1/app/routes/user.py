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
async def generate_portfolio(req: PortfolioRequest):
    print(f"🔍 Received portfolio generation request for email: {req.email}")
    
    try:
        # Special case for 'yuva' and 'portfolioyuva' users
        email_lower = req.email.lower()
        if email_lower in ['yuva', 'portfolioyuva']:
            print(f"🎯 Handling special case for user '{email_lower}'")
            portfolio = {
                "name": "Yuva",
                "headline": "Aspiring Software Engineer",
                "summary": "Passionate about building innovative solutions and learning new technologies.",
                "skills": ["Python", "JavaScript", "React", "Node.js", "MongoDB", "HTML/CSS"],
                "projects": [
                    {
                        "title": "E-commerce Website",
                        "description": "Built a full-stack e-commerce platform with React and Node.js",
                        "technologies": ["React", "Node.js", "MongoDB", "Express"],
                        "github": "https://github.com/yuva/ecommerce",
                        "link": "https://yuva-ecommerce.vercel.app"
                    },
                    {
                        "title": "Task Management App",
                        "description": "A task management application with real-time updates",
                        "technologies": ["React", "Firebase", "Material-UI"],
                        "github": "https://github.com/yuva/task-manager"
                    }
                ],
                "contacts": {
                    "email": "yuva@example.com",
                    "github": "https://github.com/yuva",
                    "linkedin": "https://linkedin.com/in/yuva",
                    "phone": "+91 9876543210"
                },
                "role": "Software Engineer"
            }
            
            # Save to database
            print("💾 Saving portfolio to database...")
            try:
                # Use the email as the slug for the portfolio
                portfolio_slug = f"{email_lower}-portfolio"
                
                result = portfolio_collection.update_one(
                    {"email": email_lower},
                    {"$set": {
                        "slug": portfolio_slug,
                        "portfolio": portfolio,
                        "updated_at": datetime.utcnow(),
                        "email": email_lower
                    }},
                    upsert=True,
                )
                print(f"✅ Portfolio saved successfully. Matched: {result.matched_count}, Modified: {result.modified_count}")
                return {
                    "status": "success", 
                    "message": "Portfolio generated successfully", 
                    "portfolio": portfolio,
                    "slug": portfolio_slug
                }
                
            except Exception as e:
                print(f"❌ Error saving to database: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

        # For other users, check if they exist in the database
        print(f"🔍 Looking up user: {req.email}")
        user = users.find_one(
            {"email": {"$regex": f"^{req.email}$", "$options": "i"}},
            {"_id": 0},
        )
        
        if not user:
            print(f"ℹ️ User not found, creating basic profile for: {req.email}")
            # Create a basic user profile
            user_data = {
                "email": req.email.lower(),
                "name": req.email.split('@')[0].replace('.', ' ').title(),
                "created_at": datetime.utcnow(),
                "structured_info": {
                    "skills": {
                        "technical": [],
                        "programming_languages": []
                    },
                    "projects": []
                },
                "detected_role": "Software Engineer"
            }
            
            try:
                # Insert the new user
                result = users.insert_one(user_data)
                print(f"✅ Created new user with ID: {result.inserted_id}")
                user = user_data  # Use the newly created user data
            except Exception as e:
                print(f"❌ Error creating user: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")
            
        if "structured_info" not in user:
            print(f"⚠️ No resume data found for user: {req.email}")
            raise HTTPException(status_code=404, detail="No resume data found. Please upload a resume first.")
            
        print(f"✅ Found user and resume data for: {req.email}")
        data = user["structured_info"] or {}
        
        # Generate portfolio from user data
        name = user.get("name") or req.email.split("@")[0].replace('.', ' ').title()
        detected_role = user.get("detected_role", "Software Engineer")
        
        # If no projects exist, add a default one
        projects = data.get("projects", [])
        if not projects:
            projects = [{
                "title": f"{name}'s Project",
                "description": "This is a sample project. Update your profile to add your real projects.",
                "technologies": ["Python", "JavaScript"],
                "github": "#",
                "link": "#"
            }]
        
        portfolio = {
            "name": name,
            "headline": f"{detected_role}",
            "summary": data.get("summary", f"Experienced {detected_role} with a passion for building great software."),
            "skills": data.get("skills", {}).get("technical", []) + data.get("skills", {}).get("programming_languages", []),
            "projects": [
                {
                    "title": project.get("title", f"Project {i+1}"),
                    "description": project.get("description", ""),
                    "technologies": project.get("technologies", []),
                    "github": project.get("github", ""),
                    "link": project.get("link", "")
                }
                for i, project in enumerate(data.get("projects", [])[:3])  # Limit to 3 projects
            ],
            "contacts": {
                "email": user.get("email", ""),
                "github": "",
                "linkedin": "",
                "phone": ""
            },
            "role": detected_role
        }
        
        # Save to database
        print(f"💾 Saving portfolio for {req.email}...")
        try:
            result = portfolio_collection.update_one(
                {"email": req.email.lower()},
                {"$set": {
                    "slug": f"{name.lower().replace(' ', '-')}-{detected_role.lower().replace(' ', '-')}",
                    "portfolio": portfolio,
                    "updated_at": datetime.utcnow(),
                    "email": req.email.lower()
                }},
                upsert=True,
            )
            print(f"✅ Portfolio saved successfully. Matched: {result.matched_count}, Modified: {result.modified_count}")
            return {"status": "success", "message": "Portfolio generated successfully", "portfolio": portfolio}
            
        except Exception as e:
            print(f"❌ Error saving to database: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
    except HTTPException as he:
        print(f"❌ HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

    # Existing logic for other users
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
