import json
from typing import Any, Dict

from app.config import openrouter_client


async def generate_guidance(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate detailed career guidance for a student using LLM.

    Input: structured resume data (same shape as structured_info in DB).
    Output: a structured JSON object containing:
      - technical_skills: [{name, level}]
      - missing_skills: [{name, reason}]
      - learning_paths: [
            {
              track,  # e.g. "Web Development"
              topics: [str],
              tools: [str],
              exercises: [str],
              projects: [str],
              estimated_time_weeks: int
            }
        ]
      - project_ideas: [{title, type, description}]
      - certificate_recommendations: [{name, value_level, recommendation, reason}]
      - role_matching: [
            {
              role,
              match_percentage,
              matched_skills: [str],
              missing_skills: [str],
              additional_skills_to_learn: [str]
            }
        ]
      - weak_skills: [{name, reason}]
      - recommended_tech_stacks: [{stack, reason}]
      - career_clarity_summary: {
            primary_alignment: str,
            aligned_roles: [str],
            roles_to_avoid: [str],
            reasoning: str
        }
      - weekly_schedule: [
            {
              week: int,
              focus: str,
              topics: [str],
              practice_tasks: [str],
              checkpoints: [str]
            }
        ]
    """
    if not openrouter_client:
        return {}

    cleaned_resume = resume_data or {}

    schema_description = {
        "technical_skills": [
            {"name": "Python", "level": "intermediate"}
        ],
        "missing_skills": [
            {"name": "Git", "reason": "Needed for collaboration and version control in most software roles."}
        ],
        "learning_paths": [
            {
                "track": "Web Development",
                "topics": [
                    "HTML, CSS basics",
                    "JavaScript fundamentals",
                    "Frontend framework (React or similar)",
                    "Backend basics (APIs, database)",
                    "Deployment and hosting"
                ],
                "tools": ["VS Code", "Git & GitHub", "Browser DevTools"],
                "exercises": [
                    "Rebuild a static landing page",
                    "Consume a public REST API",
                    "Implement basic authentication"
                ],
                "projects": [
                    "Personal portfolio website",
                    "Task manager app",
                    "Mini e-commerce or blog platform"
                ],
                "estimated_time_weeks": 6
            }
        ],
        "project_ideas": [
            {
                "title": "Job Tracker Dashboard",
                "type": "portfolio",
                "description": "Track job applications, interview stages, and notes with simple analytics."
            }
        ],
        "certificate_recommendations": [
            {
                "name": "AWS Cloud Practitioner",
                "value_level": "high",
                "recommendation": "pursue",
                "reason": "Good entry-level cloud certificate for freshers."
            }
        ],
        "role_matching": [
            {
                "role": "Full Stack Developer",
                "match_percentage": 78,
                "matched_skills": ["JavaScript", "React", "Node.js"],
                "missing_skills": ["Docker"],
                "additional_skills_to_learn": ["CI/CD", "basic cloud deployment"]
            }
        ],
        "weak_skills": [
            {
                "name": "MS Word",
                "reason": "Very generic skill; does not significantly help for tech hiring."
            }
        ],
        "recommended_tech_stacks": [
            {
                "stack": "MERN (MongoDB, Express, React, Node.js)",
                "reason": "Matches current JavaScript skills and web projects."
            }
        ],
        "career_clarity_summary": {
            "primary_alignment": "Full Stack / Web Development",
            "aligned_roles": ["Full Stack Developer", "Frontend Developer"],
            "roles_to_avoid": ["Hardcore Embedded Developer"],
            "reasoning": "Most skills and projects are web-focused rather than low-level systems."
        },
        "weekly_schedule": [
            {
                "week": 1,
                "focus": "Strengthen core programming and Git",
                "topics": ["Language fundamentals", "Git basics"],
                "practice_tasks": ["Solve 10 easy problems", "Push a small project to GitHub"],
                "checkpoints": ["Configured GitHub", "Understand branching and commits"]
            }
        ],
    }

    prompt = (
        "You are a career guidance AI for freshers. "
        "Given the following structured resume data, generate a DETAILED but COMPACT guidance plan.\n\n"
        "STRICT RULES:\n"
        "- Return ONLY valid JSON. No markdown, no commentary, no backticks.\n"
        "- Follow EXACTLY this JSON shape (keys and types) and do not add new top-level keys.\n"
        "- Keep explanations short and practical.\n\n"
        "JSON SCHEMA EXAMPLE (STRUCTURE ONLY, ADAPT CONTENT TO CANDIDATE):\n"
        f"{json.dumps(schema_description, indent=2)}\n\n"
        "Consider ALL of these when generating guidance:\n"
        "1) Extract and normalize technical skills and remove duplicates.\n"
        "2) Estimate skill levels (beginner/intermediate/advanced) based on projects, certificates, and wording.\n"
        "3) Detect missing but important skills based on skills + projects + interests.\n"
        "4) Create learning paths for suitable tracks among: Web Development, Data Science, Cloud Engineer, Machine Learning / AI, Cybersecurity.\n"
        "5) Generate unique project ideas (mini, portfolio, capstone).\n"
        "6) Recommend useful and low-value certificates with reasoning.\n"
        "7) Match candidate to roles with match percentage and skills gap.\n"
        "8) Identify redundant or weak skills.\n"
        "9) Suggest tech stack paths (e.g. MERN, Django, Spring, ML stack).\n"
        "10) Provide a short career clarity summary.\n"
        "11) Build a 4–8 week weekly improvement schedule.\n\n"
        "Now generate the JSON guidance for this specific resume data:\n"
        f"RESUME_DATA: {json.dumps(cleaned_resume, ensure_ascii=False)}"
    )

    try:
        response = openrouter_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return JSON only. No markdown, no commentary.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=1500,
        )

        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(content)
        except Exception:
            # If parsing fails, wrap as error payload to avoid crashing caller
            return {"error": "Failed to parse guidance JSON", "raw": content}

        # Ensure expected keys exist with sane defaults
        def ensure_list(obj, key):
            val = obj.get(key)
            return val if isinstance(val, list) else []

        def ensure_dict(obj, key):
            val = obj.get(key)
            return val if isinstance(val, dict) else {}

        result: Dict[str, Any] = {}
        result["technical_skills"] = ensure_list(data, "technical_skills")
        result["missing_skills"] = ensure_list(data, "missing_skills")
        result["learning_paths"] = ensure_list(data, "learning_paths")
        result["project_ideas"] = ensure_list(data, "project_ideas")
        result["certificate_recommendations"] = ensure_list(data, "certificate_recommendations")
        result["role_matching"] = ensure_list(data, "role_matching")
        result["weak_skills"] = ensure_list(data, "weak_skills")
        result["recommended_tech_stacks"] = ensure_list(data, "recommended_tech_stacks")
        result["career_clarity_summary"] = ensure_dict(data, "career_clarity_summary")
        result["weekly_schedule"] = ensure_list(data, "weekly_schedule")

        return result

    except Exception as exc:
        return {"error": f"Guidance LLM call failed: {str(exc)}"}
