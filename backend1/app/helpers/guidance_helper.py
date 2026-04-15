import json
from typing import Any, Dict

from app.config import openrouter_client


def _build_fallback_guidance(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback guidance when LLM is unavailable or fails.

    Uses the resume's technical skills (if any) to populate technical_skills
    and returns a compact but useful default for all sections.
    """
    cleaned_resume = resume_data or {}
    skills_block = cleaned_resume.get("skills", {}) or {}
    technical_skills = skills_block.get("technical", []) or []

    tech_skill_objs = [
        {"name": str(s).strip(), "level": "intermediate"}
        for s in technical_skills
        if str(s).strip()
    ]

    # Simple heuristic for primary alignment based on skills / interests
    text_blobs = " ".join(
        [" ".join(technical_skills)]
        + [
            " ".join(skills_block.get("area_of_interest", []) or []),
        ]
    ).lower()

    if any(k in text_blobs for k in ["react", "javascript", "frontend", "html", "css"]):
        primary_alignment = "Web Development"
        aligned_roles = ["Frontend Developer", "Full Stack Developer"]
    elif any(k in text_blobs for k in ["python", "django", "flask", "api", "backend"]):
        primary_alignment = "Backend Development"
        aligned_roles = ["Backend Developer", "Full Stack Developer"]
    elif any(k in text_blobs for k in ["pandas", "numpy", "data", "sql", "analytics"]):
        primary_alignment = "Data Science"
        aligned_roles = ["Data Analyst", "Data Engineer"]
    elif any(k in text_blobs for k in ["ml", "machine learning", "ai", "deep learning"]):
        primary_alignment = "Machine Learning / AI"
        aligned_roles = ["ML Engineer", "Data Scientist"]
    elif any(k in text_blobs for k in ["aws", "azure", "gcp", "cloud"]):
        primary_alignment = "Cloud / DevOps"
        aligned_roles = ["Cloud Engineer", "DevOps Engineer"]
    elif any(k in text_blobs for k in ["security", "cyber", "network", "vulnerability"]):
        primary_alignment = "Cybersecurity"
        aligned_roles = ["Security Analyst", "Cybersecurity Engineer"]
    else:
        primary_alignment = "General Software Development"
        aligned_roles = ["Software Developer", "Full Stack Developer"]

    # Technical skills
    technical_skills_section = tech_skill_objs or [
        {"name": "Programming Fundamentals", "level": "intermediate"}
    ]

    # Missing skills (simple rule-based gaps)
    missing_skills = []
    lower_skills = {str(s).lower() for s in technical_skills}
    core_gaps = []

    if "git" not in lower_skills:
        core_gaps.append({
            "name": "Git",
            "reason": "Version control is essential for almost all modern development workflows."
        })
    if "linux" not in lower_skills:
        core_gaps.append({
            "name": "Linux basics",
            "reason": "Most backend, cloud and DevOps work relies heavily on Linux environments."
        })

    track_specific_gaps = []
    if primary_alignment == "Web Development":
        if not any(k in lower_skills for k in ["react", "angular", "vue"]):
            track_specific_gaps.append({
                "name": "Modern frontend framework (React / Angular / Vue)",
                "reason": "Companies expect at least one modern framework for serious web work."
            })
        if "node" not in lower_skills and "django" not in lower_skills and "flask" not in lower_skills:
            track_specific_gaps.append({
                "name": "Backend framework",
                "reason": "To build full-stack apps you should know at least one backend framework."
            })
    elif primary_alignment == "Data Science":
        if "pandas" not in lower_skills:
            track_specific_gaps.append({
                "name": "Pandas",
                "reason": "Core library for data manipulation and analysis in Python."
            })
        if "sql" not in lower_skills:
            track_specific_gaps.append({
                "name": "SQL",
                "reason": "Data roles almost always require querying relational databases."
            })
    elif primary_alignment == "Machine Learning / AI":
        if not any(k in lower_skills for k in ["scikit-learn", "sklearn", "tensorflow", "pytorch"]):
            track_specific_gaps.append({
                "name": "ML framework (Scikit-learn / TensorFlow / PyTorch)",
                "reason": "Hands-on ML requires experience with at least one major framework."
            })
    elif primary_alignment == "Cloud / DevOps":
        if not any(k in lower_skills for k in ["docker", "kubernetes"]):
            track_specific_gaps.append({
                "name": "Containerization (Docker)",
                "reason": "Modern cloud deployments rely heavily on container-based workflows."
            })

    missing_skills = core_gaps + track_specific_gaps

    # Learning paths: single primary track derived from alignment
    learning_track_name = primary_alignment
    if primary_alignment == "Web Development":
        learning_topics = [
            "HTML & CSS fundamentals",
            "Modern JavaScript (ES6+)",
            "React basics (components, props, state)",
            "REST API integration",
            "Basic backend (Node.js / Django / Flask)",
        ]
        learning_tools = ["VS Code", "Git & GitHub", "Chrome DevTools"]
        learning_projects = [
            "Personal portfolio website",
            "Task manager app with login",
            "Mini blog or notes app with CRUD",
        ]
    elif primary_alignment == "Data Science":
        learning_topics = [
            "Python for data analysis",
            "Numpy & Pandas",
            "Data visualization (Matplotlib / Seaborn)",
            "Exploratory data analysis",
            "Intro to ML algorithms",
        ]
        learning_tools = ["Jupyter / Colab", "Git", "Excel / Google Sheets"]
        learning_projects = [
            "Sales or KPI dashboard",
            "Exploratory analysis of a public dataset",
            "Customer segmentation mini-project",
        ]
    elif primary_alignment == "Machine Learning / AI":
        learning_topics = [
            "Linear algebra & probability refresher",
            "Supervised learning with Scikit-learn",
            "Feature engineering",
            "Model evaluation & cross-validation",
            "Intro to deep learning (TensorFlow / PyTorch)",
        ]
        learning_tools = ["Python", "Scikit-learn", "TensorFlow/PyTorch", "Git"]
        learning_projects = [
            "Classification model (e.g., spam, churn)",
            "Regression model (e.g., house prices)",
            "Image or text classification mini-project",
        ]
    elif primary_alignment == "Cloud / DevOps":
        learning_topics = [
            "Linux & shell basics",
            "Cloud fundamentals (AWS / Azure / GCP)",
            "Docker & containerization",
            "CI/CD basics",
            "Infrastructure as Code overview",
        ]
        learning_tools = ["Linux", "Git", "Docker", "Any cloud free tier"]
        learning_projects = [
            "Deploy a simple web app to cloud",
            "Dockerize an existing project",
            "Set up a basic CI pipeline for tests",
        ]
    elif primary_alignment == "Cybersecurity":
        learning_topics = [
            "Networking fundamentals",
            "Linux security basics",
            "OWASP Top 10 overview",
            "Intro to vulnerability scanning",
            "Secure coding practices",
        ]
        learning_tools = ["Wireshark", "Burp Suite Community", "Linux", "Git"]
        learning_projects = [
            "Simple web app security review",
            "CTF-style challenges (TryHackMe / HackTheBox)",
            "Network traffic analysis mini-project",
        ]
    else:
        learning_topics = [
            "Programming fundamentals & problem solving",
            "Data structures & algorithms basics",
            "Version control with Git",
            "Building and consuming REST APIs",
        ]
        learning_tools = ["VS Code", "Git", "LeetCode / CodeChef"]
        learning_projects = [
            "CLI or desktop utility app",
            "Small REST API service",
            "Personal knowledge management tool",
        ]

    learning_paths = [
        {
            "track": learning_track_name,
            "topics": learning_topics,
            "tools": learning_tools,
            "exercises": [
                "Take handwritten notes on each topic and summarize in your own words",
                "Implement at least one mini-example per topic",
                "Push every experiment to GitHub with clear commits",
            ],
            "projects": learning_projects,
            "estimated_time_weeks": 6,
        }
    ]

    # Project ideas using alignment & interests
    interests = skills_block.get("area_of_interest", []) or []
    primary_interest = interests[0] if interests else primary_alignment
    project_ideas = [
        {
            "title": f"{primary_interest} Mini Project",
            "type": "mini",
            "description": f"A small project to apply {primary_interest} concepts using your current skills.",
        },
        {
            "title": f"{primary_alignment} Portfolio Project",
            "type": "portfolio",
            "description": "End-to-end project you can showcase in your resume and GitHub profile.",
        },
    ]

    # Certificate recommendations
    certs = []
    if primary_alignment in {"Web Development", "Backend Development", "General Software Development"}:
        certs.append({
            "name": "GitHub Foundations / Any Git course",
            "value_level": "medium",
            "recommendation": "pursue",
            "reason": "Confirms your understanding of Git and GitHub workflows.",
        })
    if primary_alignment in {"Cloud / DevOps", "Web Development", "Backend Development"}:
        certs.append({
            "name": "AWS Cloud Practitioner or equivalent cloud fundamentals",
            "value_level": "high",
            "recommendation": "pursue",
            "reason": "Good entry-level certificate for proving cloud fundamentals.",
        })
    if primary_alignment in {"Data Science", "Machine Learning / AI"}:
        certs.append({
            "name": "Google Data Analytics / ML specialization",
            "value_level": "medium",
            "recommendation": "pursue",
            "reason": "Shows structured learning in data/ML for fresher roles.",
        })

    # Low-value certificates that are generally weak
    certs.append({
        "name": "Generic 'MS Office' course",
        "value_level": "low",
        "recommendation": "avoid",
        "reason": "Too basic for IT hiring; better to focus on technical certificates.",
    })

    # Role matching
    role_matching = [
        {
            "role": aligned_roles[0],
            "match_percentage": 80,
            "matched_skills": list(sorted(technical_skills))[:5],
            "missing_skills": [gap["name"] for gap in track_specific_gaps] if track_specific_gaps else [],
            "additional_skills_to_learn": [gap["name"] for gap in core_gaps],
        }
    ]

    # Weak / low-value skills
    weak_keywords = ["ms word", "ms office", "browsing", "basic computer", "internet"]
    weak_skills = []
    for s in technical_skills:
        s_lower = str(s).lower()
        if any(w in s_lower for w in weak_keywords):
            weak_skills.append({
                "name": s,
                "reason": "Very generic or outdated skill; does not add much value to a tech resume.",
            })

    # Recommended tech stacks
    recommended_tech_stacks = []
    if primary_alignment == "Web Development":
        recommended_tech_stacks.append({
            "stack": "MERN (MongoDB, Express, React, Node.js)",
            "reason": "Great full-stack path if you are already comfortable with JavaScript.",
        })
    if primary_alignment == "Backend Development":
        recommended_tech_stacks.append({
            "stack": "Python + FastAPI / Django",
            "reason": "Python has strong ecosystem support for APIs and backend services.",
        })
    if primary_alignment == "Data Science":
        recommended_tech_stacks.append({
            "stack": "Python data stack (Pandas, Numpy, Scikit-learn)",
            "reason": "Standard stack used in most entry-level data roles.",
        })
    if primary_alignment == "Machine Learning / AI":
        recommended_tech_stacks.append({
            "stack": "Python ML stack (Scikit-learn, TensorFlow/PyTorch)",
            "reason": "Covers both classical ML and deep learning for projects.",
        })
    if primary_alignment == "Cloud / DevOps":
        recommended_tech_stacks.append({
            "stack": "Docker + Kubernetes + AWS/GCP/Azure",
            "reason": "Common toolset used for cloud-native deployments.",
        })

    if not recommended_tech_stacks:
        recommended_tech_stacks.append({
            "stack": "MERN or Python + Django",
            "reason": "Both stacks are beginner-friendly and highly in-demand for fresher roles.",
        })

    # Career clarity summary
    roles_to_avoid = []
    if primary_alignment in {"Web Development", "Backend Development"}:
        roles_to_avoid.append("Low-level Embedded / Firmware roles")
    elif primary_alignment in {"Data Science", "Machine Learning / AI"}:
        roles_to_avoid.append("Pure UI/UX or graphic design roles")

    career_clarity_summary = {
        "primary_alignment": primary_alignment,
        "aligned_roles": aligned_roles,
        "roles_to_avoid": roles_to_avoid,
        "reasoning": "Alignment inferred from your current skills and areas of interest. Use this as a direction, not a hard limit.",
    }

    # Weekly schedule derived from learning topics
    weeks = []
    topics_per_week = max(1, len(learning_topics) // 4 or 1)
    for i in range(4):
        start = i * topics_per_week
        chunk = learning_topics[start:start + topics_per_week]
        if not chunk:
            break
        weeks.append({
            "week": i + 1,
            "focus": f"Focus on: {primary_alignment} fundamentals (week {i + 1})",
            "topics": chunk,
            "practice_tasks": [
                "Create notes and mind-maps for each topic",
                "Implement at least one small example per topic",
            ],
            "checkpoints": [
                "Able to explain each topic in simple words",
                "Pushed practice code to GitHub",
            ],
        })

    if not weeks:
        weeks.append({
            "week": 1,
            "focus": "Consolidate fundamentals and set up environment",
            "topics": learning_topics[:3],
            "practice_tasks": ["Set up all tools", "Finish one mini project"],
            "checkpoints": ["Tools installed", "Project completed"],
        })

    return {
        "technical_skills": technical_skills_section,
        "missing_skills": missing_skills,
        "learning_paths": learning_paths,
        "project_ideas": project_ideas,
        "certificate_recommendations": certs,
        "role_matching": role_matching,
        "weak_skills": weak_skills,
        "recommended_tech_stacks": recommended_tech_stacks,
        "career_clarity_summary": career_clarity_summary,
        "weekly_schedule": weeks,
    }


async def generate_guidance(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate detailed career guidance for a student using LLM.

    Always returns a non-empty structured dict. If the LLM is unavailable or
    fails, a sensible fallback guidance is returned instead.
    """

    cleaned_resume = resume_data or {}

    # If no LLM client, immediately return fallback guidance
    if not openrouter_client:
        return _build_fallback_guidance(cleaned_resume)

    # Use the fallback structure as an example schema in the prompt
    example_schema = _build_fallback_guidance(cleaned_resume)

    prompt = (
        "You are a career guidance AI for freshers. "
        "Given the following structured resume data, generate a DETAILED but COMPACT guidance plan.\n\n"
        "STRICT RULES:\n"
        "- Return ONLY valid JSON. No markdown, no commentary, no backticks.\n"
        "- Follow EXACTLY this JSON shape (keys and types) and do not add new top-level keys.\n"
        "- Keep explanations short and practical.\n\n"
        "JSON SCHEMA EXAMPLE (STRUCTURE ONLY, ADAPT CONTENT TO CANDIDATE):\n"
        f"{json.dumps(example_schema, indent=2)}\n\n"
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
            model="openai/gpt-4o-mini",
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
            # If parsing fails, fall back to deterministic guidance
            return _build_fallback_guidance(cleaned_resume)

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

        # If the model returned everything empty, still provide fallback so UI is not blank
        if not any(
            [
                result["technical_skills"],
                result["missing_skills"],
                result["learning_paths"],
                result["project_ideas"],
                result["certificate_recommendations"],
                result["role_matching"],
                result["weak_skills"],
                result["recommended_tech_stacks"],
                result["weekly_schedule"],
            ]
        ):
            return _build_fallback_guidance(cleaned_resume)

        return result

    except Exception:
        # On any runtime error, fall back instead of returning only an error
        return _build_fallback_guidance(cleaned_resume)


def _build_fallback_role_roadmap(target_role: str, current_skills: list, experience_level: str) -> Dict[str, Any]:
    """Fallback roadmap when LLM is unavailable."""
    
    # Define role requirements for common roles
    role_requirements = {
        "frontend developer": {
            "required_skills": ["HTML", "CSS", "JavaScript", "React", "Git", "REST APIs", "Responsive Design"],
            "nice_to_have": ["TypeScript", "Next.js", "Tailwind CSS", "Testing", "Redux"],
            "projects": [
                {"title": "Portfolio Website", "description": "Personal portfolio showcasing your work", "difficulty": "beginner"},
                {"title": "E-commerce Product Page", "description": "Product listing with filters and cart", "difficulty": "intermediate"},
                {"title": "Dashboard Application", "description": "Data visualization dashboard with charts", "difficulty": "advanced"},
            ],
        },
        "backend developer": {
            "required_skills": ["Python", "SQL", "REST APIs", "Git", "Linux basics", "Database Design", "Authentication"],
            "nice_to_have": ["FastAPI/Django/Flask", "Docker", "Redis", "MongoDB", "AWS"],
            "projects": [
                {"title": "REST API Service", "description": "CRUD API with authentication", "difficulty": "beginner"},
                {"title": "Task Queue System", "description": "Background job processing system", "difficulty": "intermediate"},
                {"title": "Microservices Architecture", "description": "Multi-service backend with API gateway", "difficulty": "advanced"},
            ],
        },
        "full stack developer": {
            "required_skills": ["HTML", "CSS", "JavaScript", "Python/Node.js", "SQL", "React/Vue", "REST APIs", "Git"],
            "nice_to_have": ["TypeScript", "Docker", "MongoDB", "AWS/GCP", "CI/CD"],
            "projects": [
                {"title": "Blog Platform", "description": "Full stack blog with authentication", "difficulty": "beginner"},
                {"title": "Social Media Clone", "description": "Twitter/Instagram clone with real-time features", "difficulty": "intermediate"},
                {"title": "SaaS Application", "description": "Subscription-based service with payments", "difficulty": "advanced"},
            ],
        },
        "data scientist": {
            "required_skills": ["Python", "Pandas", "NumPy", "SQL", "Statistics", "Machine Learning", "Data Visualization"],
            "nice_to_have": ["TensorFlow/PyTorch", "Scikit-learn", "Spark", "Deep Learning", "NLP"],
            "projects": [
                {"title": "EDA Project", "description": "Exploratory data analysis on a dataset", "difficulty": "beginner"},
                {"title": "Prediction Model", "description": "ML model for classification/regression", "difficulty": "intermediate"},
                {"title": "End-to-end ML Pipeline", "description": "Complete ML system with deployment", "difficulty": "advanced"},
            ],
        },
        "data analyst": {
            "required_skills": ["SQL", "Excel", "Python", "Data Visualization", "Statistics", "Pandas"],
            "nice_to_have": ["Tableau/Power BI", "R", "A/B Testing", "ETL", "Business Analytics"],
            "projects": [
                {"title": "Sales Dashboard", "description": "Interactive sales analytics dashboard", "difficulty": "beginner"},
                {"title": "Customer Segmentation", "description": "Segment customers using clustering", "difficulty": "intermediate"},
                {"title": "Business Intelligence Report", "description": "Comprehensive BI report with insights", "difficulty": "advanced"},
            ],
        },
        "ml engineer": {
            "required_skills": ["Python", "TensorFlow/PyTorch", "Scikit-learn", "SQL", "Docker", "MLOps basics", "Git"],
            "nice_to_have": ["Kubernetes", "AWS/GCP ML Services", "Feature Engineering", "Model Optimization", "A/B Testing"],
            "projects": [
                {"title": "Image Classifier", "description": "CNN-based image classification", "difficulty": "beginner"},
                {"title": "NLP Pipeline", "description": "Text processing and sentiment analysis", "difficulty": "intermediate"},
                {"title": "ML System with Monitoring", "description": "Production ML with monitoring and retraining", "difficulty": "advanced"},
            ],
        },
        "devops engineer": {
            "required_skills": ["Linux", "Docker", "CI/CD", "Git", "Cloud (AWS/GCP/Azure)", "Scripting", "Kubernetes"],
            "nice_to_have": ["Terraform", "Ansible", "Prometheus/Grafana", "Security", "Networking"],
            "projects": [
                {"title": "CI/CD Pipeline", "description": "Automated build and deploy pipeline", "difficulty": "beginner"},
                {"title": "Container Orchestration", "description": "Kubernetes cluster setup", "difficulty": "intermediate"},
                {"title": "Infrastructure as Code", "description": "Full infrastructure automation", "difficulty": "advanced"},
            ],
        },
    }
    
    # Normalize role name
    role_lower = target_role.lower().strip()
    role_data = None
    for key in role_requirements:
        if key in role_lower or role_lower in key:
            role_data = role_requirements[key]
            break
    
    if not role_data:
        role_data = role_requirements.get("full stack developer")
    
    # Compare skills
    current_skills_lower = {s.lower().strip() for s in current_skills}
    
    skills_you_have = []
    skills_to_learn = []
    
    for skill in role_data["required_skills"]:
        skill_lower = skill.lower()
        if any(skill_lower in cs or cs in skill_lower for cs in current_skills_lower):
            skills_you_have.append({"name": skill, "status": "have"})
        else:
            skills_to_learn.append({"name": skill, "priority": "high", "reason": f"Core requirement for {target_role}"})
    
    for skill in role_data["nice_to_have"]:
        skill_lower = skill.lower()
        if any(skill_lower in cs or cs in skill_lower for cs in current_skills_lower):
            skills_you_have.append({"name": skill, "status": "have"})
        else:
            skills_to_learn.append({"name": skill, "priority": "medium", "reason": f"Will make you stand out for {target_role}"})
    
    # Calculate match percentage
    total_required = len(role_data["required_skills"])
    matched_required = len([s for s in skills_you_have if s["name"] in role_data["required_skills"]])
    match_percentage = int((matched_required / total_required) * 100) if total_required > 0 else 0
    
    # Build learning roadmap
    high_priority = [s for s in skills_to_learn if s["priority"] == "high"]
    medium_priority = [s for s in skills_to_learn if s["priority"] == "medium"]
    
    roadmap_phases = []
    
    if high_priority:
        phase1_skills = high_priority[:3]
        roadmap_phases.append({
            "phase": 1,
            "title": "Foundation Phase",
            "duration": "4-6 weeks",
            "focus": "Master the core fundamentals",
            "skills": [s["name"] for s in phase1_skills],
            "action_items": [
                f"Study {s['name']} fundamentals with tutorials and documentation" for s in phase1_skills
            ],
            "milestone": "Complete foundational projects using these skills"
        })
        
        if len(high_priority) > 3:
            phase2_skills = high_priority[3:]
            roadmap_phases.append({
                "phase": 2,
                "title": "Core Skills Phase",
                "duration": "4-6 weeks",
                "focus": "Build on your foundation",
                "skills": [s["name"] for s in phase2_skills],
                "action_items": [
                    f"Deep dive into {s['name']} with hands-on projects" for s in phase2_skills
                ],
                "milestone": "Build intermediate-level projects"
            })
    
    if medium_priority:
        roadmap_phases.append({
            "phase": len(roadmap_phases) + 1,
            "title": "Advanced Skills Phase",
            "duration": "4-8 weeks",
            "focus": "Stand out from other candidates",
            "skills": [s["name"] for s in medium_priority[:4]],
            "action_items": [
                f"Learn {s['name']} to enhance your profile" for s in medium_priority[:4]
            ],
            "milestone": "Build a portfolio-worthy project"
        })
    
    # Always add final phase
    roadmap_phases.append({
        "phase": len(roadmap_phases) + 1,
        "title": "Job Ready Phase",
        "duration": "2-4 weeks",
        "focus": "Prepare for interviews and applications",
        "skills": ["System Design Basics", "Problem Solving", "Communication"],
        "action_items": [
            "Practice coding problems on LeetCode/HackerRank",
            "Prepare for behavioral interviews",
            "Polish your resume and LinkedIn",
            "Apply to companies and prepare for technical rounds"
        ],
        "milestone": "Land your first job!"
    })
    
    return {
        "target_role": target_role,
        "match_percentage": match_percentage,
        "skills_you_have": skills_you_have,
        "skills_to_learn": skills_to_learn,
        "roadmap_phases": roadmap_phases,
        "projects": role_data["projects"],
        "estimated_timeline": f"{len(roadmap_phases) * 4}-{len(roadmap_phases) * 6} weeks",
        "tips": [
            f"Focus on building projects that demonstrate {target_role} skills",
            "Contribute to open source to gain real-world experience",
            "Network with professionals in your target role",
            "Keep learning and stay updated with industry trends"
        ]
    }


async def generate_role_roadmap(target_role: str, current_skills: list, experience_level: str = "fresher") -> Dict[str, Any]:
    """Generate a personalized learning roadmap for a specific role."""
    
    try:
        if openrouter_client is None:
            return _build_fallback_role_roadmap(target_role, current_skills, experience_level)
        
        skills_text = ", ".join(current_skills) if current_skills else "No specific technical skills listed"
        
        prompt = f"""You are a senior career coach and technical mentor. 

A {experience_level} wants to become a **{target_role}**.

Their current technical skills are: {skills_text}

Generate a comprehensive, personalized learning roadmap in JSON format with these sections:

1. **target_role**: The role they want to achieve
2. **match_percentage**: How ready they are (0-100) based on current skills vs requirements
3. **skills_you_have**: Array of skills they already have that are relevant
   - Each item: {{"name": "skill", "status": "have", "relevance": "high/medium/low"}}
4. **skills_to_learn**: Array of skills they need to learn
   - Each item: {{"name": "skill", "priority": "high/medium/low", "reason": "why needed", "learning_time": "X weeks"}}
5. **roadmap_phases**: Step-by-step learning phases
   - Each phase: {{"phase": 1, "title": "Phase name", "duration": "X weeks", "focus": "what to focus on", "skills": ["skill1", "skill2"], "action_items": ["action1", "action2"], "milestone": "what to achieve", "resources": ["resource1", "resource2"]}}
6. **projects**: Project ideas to build
   - Each project: {{"title": "name", "description": "what to build", "difficulty": "beginner/intermediate/advanced", "skills_used": ["skill1"], "duration": "X weeks"}}
7. **estimated_timeline**: Total time needed
8. **tips**: Array of actionable tips for success

IMPORTANT:
- Be specific and practical
- Prioritize skills from most to least important
- Include realistic time estimates
- Suggest projects that will impress employers
- Consider their current skill level when recommending resources

Return ONLY valid JSON, no markdown or explanation."""

        response = openrouter_client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=3000,
        )
        
        raw = response.choices[0].message.content.strip()
        
        # Clean JSON
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw = "\n".join(lines)
        
        data = json.loads(raw)
        
        # Validate and return
        return {
            "target_role": data.get("target_role", target_role),
            "match_percentage": data.get("match_percentage", 0),
            "skills_you_have": data.get("skills_you_have", []),
            "skills_to_learn": data.get("skills_to_learn", []),
            "roadmap_phases": data.get("roadmap_phases", []),
            "projects": data.get("projects", []),
            "estimated_timeline": data.get("estimated_timeline", "12-16 weeks"),
            "tips": data.get("tips", [])
        }
        
    except Exception:
        return _build_fallback_role_roadmap(target_role, current_skills, experience_level)
