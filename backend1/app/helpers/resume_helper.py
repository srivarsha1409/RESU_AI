# app/helpers/resume_helper.py
# Combines your resume AI logic + detailed ATS scoring
# Updated: robust language normalization + consistent OpenRouter usage

import json
import io
import pdfplumber
import re
from datetime import datetime
from urllib.parse import urlparse

from app.config import db, openrouter_client  # config.py defines db and openrouter_client


# -------------------------
# Helper: normalize languages
# -------------------------
import re

def normalize_languages(text):
    """Extract languages with proficiency from text or list input."""
    
    if not text:
        return []

    # If input is a list, join everything into one string
    if isinstance(text, list):
        text = " ".join(str(t) for t in text if t)

    text_lower = text.lower()

    language_patterns = [
        "english", "tamil", "hindi", "telugu", "malayalam", "kannada",
        "french", "german", "spanish", "marathi", "bengali", "punjabi",
        "gujarati", "urdu", "oriya", "nepali"
    ]

    pattern = r"\b(" + "|".join(language_patterns) + r")\b\s*(\([^)]+\))?"

    matches = re.findall(pattern, text_lower)

    results = []
    for lang, prof in matches:
        lang_clean = lang.capitalize()
        if prof:
            prof_clean = re.sub(r"\s+", "", prof.upper())
            result = f"{lang_clean} {prof_clean}"
        else:
            result = lang_clean

        if result not in results:
            results.append(result)

    return results



# -------------------------
# Extract username from URL
# -------------------------
def extract_username_from_input(input_str: str):
    if not input_str:
        return None
    s = input_str.strip()
    if s.startswith(("http://", "https://")) or "github.com" in s:
        if s.startswith("github.com"):
            s = "https://" + s
        parsed = urlparse(s)
        parts = [p for p in parsed.path.split("/") if p]
        return parts[0] if parts else None
    if re.match(r"^[A-Za-z0-9-_.]{1,39}$", s):
        return s
    if "/" in s:
        return s.split("/")[-1]
    return None


# -------------------------
# ATS Score Calculator
# -------------------------
import re

def calculate_ats_score(data, text, normalized_languages=None):
    score_details = {}

    text_lower = (text or "").lower()

    action_verbs = r"\b(developed|built|designed|implemented|managed|optimized|increased|reduced|led|collaborated|deployed|created|trained|improved|tested|analyzed|automated|integrated|streamlined|orchestrated|debugged|resolved|scaled|architected)\b"
    metrics_regex = r"\b(\d+%|\d+\s+(users|clients|projects|years|months)|\$\d+|\d+\s+(x|times))\b"

    tech_keywords = [
        "python","java","c++","c#","go","node","react","angular","vue","javascript","typescript",
        "mongodb","mysql","postgres","sql","redis",
        "aws","azure","gcp","docker","kubernetes","terraform",
        "tensorflow","pytorch","scikit-learn","pandas","numpy",
        "fastapi","django","flask","spring","express",
        "rest","graphql","microservices"
    ]

    tools_keywords = [
        "git","github","gitlab","jira","jenkins","figma","linux","bash","shell",
        "tableau","power bi","excel","visual studio","vscode","colab"
    ]

    soft_skills = ["leadership","communication","teamwork","problem solving","ownership","adaptability"]
    cert_keywords = ["certified","certificate","aws","azure","gcp","oracle","pmp","scrum","cisco"]

    # 1️⃣ Section coverage (max 20)
    required_sections = ["experience", "education", "skills", "projects"]
    section_score = sum(
        5 for section in required_sections if data.get(section)
    )
    score_details["Section Coverage"] = min(section_score, 20)

    # 2️⃣ Contact info (max 10)
    contact_score = 0
    if re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.\w+", text_lower): contact_score += 5
    if re.search(r"(linkedin\.com|github\.com)", text_lower): contact_score += 5
    score_details["Contact Info"] = min(contact_score, 10)

    # 3️⃣ Word count (max 5)
    word_count = len(text.split())
    wc_score = 5 if 500 <= word_count <= 1200 else 3 if word_count >= 300 else 0
    score_details["Word Count"] = wc_score

    # 4️⃣ Bullet points (max 10)
    bullet_count = len(re.findall(r"(\n\s*[-•*])", text))
    bp_score = 10 if bullet_count >= 10 else 5 if bullet_count >= 4 else 0
    score_details["Bullet Points"] = bp_score

    # 5️⃣ Action verbs + metrics (max 20)
    action_count = len(re.findall(action_verbs, text_lower))
    metric_count = len(re.findall(metrics_regex, text_lower))
    achievement_score = min(action_count*1 + metric_count*2, 20)
    score_details["Action + Achievements"] = achievement_score

    # 6️⃣ Technical skills + tools (max 30)
    tech_match = sum(1 for kw in tech_keywords if kw in text_lower)
    tools_match = sum(1 for kw in tools_keywords if kw in text_lower)
    skill_score = min((tech_match * 1.5) + (tools_match * 1), 30)
    score_details["Skills Strength"] = skill_score

    # 7️⃣ Soft skills + certifications (max 5)
    soft_score = min(sum(1 for kw in soft_skills if kw in text_lower), 2)
    cert_score = min(sum(1 for kw in cert_keywords if kw in text_lower), 3)
    score_details["Soft Skills & Certs"] = soft_score + cert_score

    # 8️⃣ Formatting Penalty (-5)
    penalty = 0
    if re.search(r"\.(png|jpg|jpeg|svg)", text_lower): penalty += 2
    try:
        if len(max(text.split("\n"), key=len)) > 150: penalty += 1
    except:
        pass
    score_details["Formatting Penalty"] = -min(penalty, 5)

    # Final score (cap at 100)
    total_score = sum(score_details.values())
    total_score = max(min(total_score, 100), 0)

    score_details["Total ATS Score"] = round(total_score, 2)

    return {
        "ats_breakdown": score_details,
        "ats_score": score_details["Total ATS Score"],
        "word_count": word_count,
        "languages": normalized_languages,
    }


# -------------------------
# LLM-based Certificate Evaluation
# -------------------------
async def evaluate_certificates(cert_list):
    """Evaluate certificate worthiness using OpenRouter LLM.

    Returns a list of objects with keys:
    certificate, worthiness_score (0-100 int), highlight (bool), reason (str).
    On any error or missing client, returns [].
    """
    if not openrouter_client:
        return []

    if not cert_list:
        return []

    # Ensure we work with a simple list of strings
    cert_strings = [str(c).strip() for c in cert_list if str(c).strip()]
    if not cert_strings:
        return []

    prompt = (
        "You are evaluating certificates for freshers. "
        "For each certificate, rate its industry value, difficulty, and relevance to IT/software roles. "
        "Return JSON only with the following schema (no extra text):\n\n"
        "[\n"
        "  {\n"
        "    \"certificate\": \"<original certificate string>\",\n"
        "    \"worthiness_score\": 0,\n"
        "    \"highlight\": false,\n"
        "    \"reason\": \"<short plain-text explanation>\"\n"
        "  }\n"
        "]\n\n"
        f"Certificates: {json.dumps(cert_strings)}"
    )

    try:
        response = openrouter_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return JSON only. Do not include commentary or markdown fences.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        raw = response.choices[0].message.content or ""
    except Exception as exc:
        print("⚠️ Certificate evaluation LLM call failed:", exc)
        return []

    raw_clean = raw.strip().replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw_clean)
    except Exception as exc:
        print("⚠️ Certificate evaluation JSON parse failed:", exc, "Raw:", raw_clean[:300])
        return []

    if isinstance(parsed, dict) and "results" in parsed:
        items = parsed.get("results", [])
    else:
        items = parsed

    if not isinstance(items, list):
        return []

    results = []
    for obj in items:
        if not isinstance(obj, dict):
            continue

        certificate = str(obj.get("certificate", "")).strip()
        if not certificate:
            continue

        # Coerce score to int 0-100
        score_val = obj.get("worthiness_score", 0)
        try:
            score_int = int(score_val)
        except Exception:
            score_int = 0
        score_int = max(0, min(100, score_int))

        # Coerce highlight to bool
        highlight_val = obj.get("highlight", False)
        if isinstance(highlight_val, str):
            highlight_bool = highlight_val.strip().lower() in {"true", "yes", "1"}
        else:
            highlight_bool = bool(highlight_val)

        reason = str(obj.get("reason", "")).strip()

        results.append(
            {
                "certificate": certificate,
                "worthiness_score": score_int,
                "highlight": highlight_bool,
                "reason": reason,
            }
        )

    return results


# -------------------------
# LLM-based Project Evaluation
# -------------------------
async def evaluate_projects(project_list):
    """Evaluate projects using OpenRouter LLM.

    Expects project_list as a list of strings or dicts from the resume JSON.
    Returns a list of objects with keys as per the strict schema:

    [
      {
        "project_title": "",
        "summary": "",
        "technologies": [],
        "domain": "",
        "problem_statement": "",
        "features": [],
        "impact": "",
        "complexity_level": "Beginner | Intermediate | Advanced",
        "relevance_score": 0,
        "missing_points": [],
        "recommended_improvements": [],
        "role_mapping": []
      }
    ]

    On any error, returns [].
    """

    if not openrouter_client:
        return []

    if not project_list:
        return []

    # Normalize to a list of simple strings describing each project
    normalized_projects = []
    for p in project_list:
        if p is None:
            continue
        if isinstance(p, str):
            text = p.strip()
        elif isinstance(p, dict):
            title = str(p.get("title") or p.get("name") or "").strip()
            desc = str(p.get("description") or p.get("details") or "").strip()
            tech = p.get("tech_stack") or p.get("technologies") or []
            if isinstance(tech, list):
                tech_text = ", ".join(str(t).strip() for t in tech if str(t).strip())
            else:
                tech_text = str(tech).strip()
            parts = [title, desc, tech_text]
            text = ". ".join(part for part in parts if part)
        else:
            text = str(p).strip()

        if text:
            normalized_projects.append(text)

    if not normalized_projects:
        return []

    schema_text = (
        "[\n"
        "  {\n"
        "    \"project_title\": \"\",\n"
        "    \"summary\": \"\",\n"
        "    \"technologies\": [],\n"
        "    \"domain\": \"\",\n"
        "    \"problem_statement\": \"\",\n"
        "    \"features\": [],\n"
        "    \"impact\": \"\",\n"
        "    \"complexity_level\": \"Beginner | Intermediate | Advanced\",\n"
        "    \"relevance_score\": 0,\n"
        "    \"missing_points\": [],\n"
        "    \"recommended_improvements\": [],\n"
        "    \"role_mapping\": []\n"
        "  }\n"
        "]"
    )

    prompt = (
        "You are evaluating student projects from a fresher resume for industry hiring. "
        "For EACH project text below, extract and evaluate using this STRICT JSON schema only (no extra keys, no comments, no markdown):\n\n"
        f"{schema_text}\n\n"
        "Field rules:\n"
        "- technologies must be a list of tools/languages/frameworks detected from the project text.\n"
        "- domain must be one of: [\"Web Development\", \"AI/ML\", \"Cloud\", \"Full Stack\", \"Mobile App\", \"IoT\", \"Cybersecurity\", \"Data Science\", \"Automation\", \"Other\"].\n"
        "- complexity_level must be based on depth of stack, integrations, and features.\n"
        "- relevance_score is an integer between 0 and 100 based on industry usefulness for fresher hiring.\n"
        "- missing_points should include items like: \"No GitHub link\", \"No deployment link\", \"Weak problem statement\", \"No measurable achievements\" when applicable.\n"
        "- role_mapping should be a list of suitable job roles such as: [\"Full Stack Developer\", \"Backend Developer\", \"Frontend Developer\", \"ML Engineer\", \"Cloud Engineer\", \"Data Analyst\", \"DevOps Engineer\", \"Software Engineer\"].\n\n"
        "Return JSON ONLY as an array where each element corresponds to each project in the same order as provided.\n\n"
        f"Projects: {json.dumps(normalized_projects)}"
    )

    try:
        response = openrouter_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return JSON only. Do not include commentary or markdown fences.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=800,
        )
        raw = response.choices[0].message.content or ""
    except Exception as exc:
        print("⚠️ Project evaluation LLM call failed:", exc)
        return []

    raw_clean = raw.strip().replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw_clean)
    except Exception as exc:
        print("⚠️ Project evaluation JSON parse failed:", exc, "Raw:", raw_clean[:300])
        return []

    if isinstance(parsed, dict) and "results" in parsed:
        items = parsed.get("results", [])
    else:
        items = parsed

    if not isinstance(items, list):
        return []

    allowed_domains = {
        "web development",
        "ai/ml",
        "cloud",
        "full stack",
        "mobile app",
        "iot",
        "cybersecurity",
        "data science",
        "automation",
        "other",
    }

    valid_complexities = {"beginner", "intermediate", "advanced"}

    results = []
    for obj in items:
        if not isinstance(obj, dict):
            continue

        title = str(obj.get("project_title", "")).strip()
        summary = str(obj.get("summary", "")).strip()
        problem = str(obj.get("problem_statement", "")).strip()
        impact = str(obj.get("impact", "")).strip()

        # Skip completely empty entries
        if not (title or summary or problem or impact):
            continue

        techs = obj.get("technologies", [])
        if isinstance(techs, list):
            techs_clean = [str(t).strip() for t in techs if str(t).strip()]
        elif isinstance(techs, str):
            techs_clean = [s.strip() for s in techs.split(",") if s.strip()]
        else:
            techs_clean = []

        domain_val = str(obj.get("domain", "")).strip()
        domain_lower = domain_val.lower()
        if domain_lower not in allowed_domains:
            domain_val = "Other"

        complexity_val = str(obj.get("complexity_level", "")).strip()
        comp_lower = complexity_val.lower()
        if comp_lower not in valid_complexities:
            # Try to infer from wording if missing/invalid
            comp_lower = "intermediate"
        # Normalize capitalization
        if comp_lower == "beginner":
            complexity_val = "Beginner"
        elif comp_lower == "advanced":
            complexity_val = "Advanced"
        else:
            complexity_val = "Intermediate"

        score_val = obj.get("relevance_score", 0)
        try:
            score_int = int(score_val)
        except Exception:
            score_int = 0
        score_int = max(0, min(100, score_int))

        def to_str_list(value):
            if not value:
                return []
            if isinstance(value, list):
                return [str(v).strip() for v in value if str(v).strip()]
            return [str(value).strip()]

        features = to_str_list(obj.get("features"))
        missing_points = to_str_list(obj.get("missing_points"))
        improvements = to_str_list(obj.get("recommended_improvements"))
        role_mapping = to_str_list(obj.get("role_mapping"))

        results.append(
            {
                "project_title": title,
                "summary": summary,
                "technologies": techs_clean,
                "domain": domain_val,
                "problem_statement": problem,
                "features": features,
                "impact": impact,
                "complexity_level": complexity_val,
                "relevance_score": score_int,
                "missing_points": missing_points,
                "recommended_improvements": improvements,
                "role_mapping": role_mapping,
            }
        )

    return results


# -------------------------
# Core Resume Processor
# -------------------------
async def process_resume_file(upload_file):
    """Handle resume PDF upload + AI parsing + ATS scoring + DB save."""
    try:
        contents = await upload_file.read()
        if not contents:
            return {"error": "Empty file received. Please upload a valid PDF."}

        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        if not text.strip():
            return {"error": "No readable text found in the uploaded PDF."}

        if not openrouter_client:
            return {"error": "AI client not configured (missing OPENROUTER_API_KEY)."}

        # Truncate long documents for model context safety (you already used similar earlier)
        max_chars = 80000  # conservative
        prompt_text = text if len(text) <= max_chars else text[:max_chars] + "\n...[Truncated for AI]..."

        # ---- AI extraction ----
        prompt = f"""
Extract structured resume info and return valid JSON ONLY.

CRITICAL RULE FOR CERTIFICATES:
  The "certificates" array must be extracted ONLY from sections whose heading (case-insensitive)
  matches one of the following variations. Ignore any certificate-like text outside these sections.
  Allowed headings:
    ["CERTIFICATE", "CERTIFICATES", "CERTIFICATION", "CERTIFICATIONS",
     "COURSES", "TRAININGS", "ACHIEVEMENTS", "SKILL CERTIFICATIONS",
     "ONLINE COURSES", "LICENSES", "CREDENTIALS"].

Return JSON in this exact structure:
{{
  "name": "", 
  "email": "", 
  "phone": "",
  "linkedin": "", 
  "github": "", 
  "leetcode": "", 
  "codechef": "",
  "languages": [],  
  "education": {{
      "10th": {{
          "school": "",
          "location": "",
          "year": "",
          "percentage": ""
      }},
      "12th": {{
          "school": "",
          "location": "",
          "year": "",
          "percentage": ""
      }},
      "bachelor": {{
          "institute": "",
          "location": "",
          "degree": "",
          "expected_graduation": "",
          "cgpa": ""
      }}
  }},
  "skills": {{
      "technical": [],
      "soft": [],
      "area_of_interest": []
  }},
  "internships": [],
  "projects": [],
  "certificates": [], 
  "role_match": "", 
  "summary": ""
}}

Resume text:
{prompt_text}
"""

        # ---- Call AI model via openrouter_client ----
        try:
            response = openrouter_client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "Return valid JSON only. Do not include commentary."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                # Slightly reduced to stay within current OpenRouter credit max_tokens limit
                max_tokens=1500,
            )
            ai_output = response.choices[0].message.content
        except Exception as exc:
            return {"error": f"AI request failed: {str(exc)}"}

        # ---- Parse JSON ----
        ai_output = ai_output.strip().replace("```json", "").replace("```", "")
        try:
            data = json.loads(ai_output)
        except Exception as e:
            return {"error": f"Failed to parse AI JSON: {str(e)}", "raw": ai_output}

        # ---- Certificate worthiness evaluation (non-blocking fallback on failure) ----
        cert_list = data.get("certificates", []) or []
        cert_analysis = await evaluate_certificates(cert_list)
        if not isinstance(cert_analysis, list):
            cert_analysis = []
        data["certificate_analysis"] = cert_analysis

        # ---- Project evaluation (LLM) ----
        project_list = data.get("projects", []) or []
        project_analysis = await evaluate_projects(project_list)
        if not isinstance(project_analysis, list):
            project_analysis = []
        data["project_analysis"] = project_analysis

        # ---- Technical skills: keep AI output as-is (no backend post-processing) ----
        # Use the "skills" block exactly as returned by the AI JSON.
        skills_block = data.get("skills", {}) or {}
        data["skills"] = skills_block

        # ---- Normalize languages (robust, but no guessing) ----
        # Use only what the AI explicitly returns in the languages field.
        raw_langs = data.get("languages", [])
        if isinstance(raw_langs, str):
            raw_langs = re.split(r"[,;/]| and ", raw_langs)
        langs = normalize_languages([lang.strip() for lang in raw_langs if lang and str(lang).strip()])

        # If the resume does not contain a languages section, leave this empty.
        # Do NOT guess or default to English/Tamil/etc.
        data["languages"] = langs

        # ---- Compute ATS ----
        ats = calculate_ats_score(data, text, normalized_languages=langs)

        # ---- Save to MongoDB ----
        try:
            await db.reports.insert_one({
                "filename": getattr(upload_file, "filename", "uploaded_resume"),
                "data": data,
                "ats_breakdown": ats["ats_breakdown"],
                "ats_score": ats["ats_score"],
                "word_count": ats["word_count"],
                "uploaded_at": datetime.utcnow(),
            })
        except Exception as e:
            print("⚠️ MongoDB insert failed:", e)

        # ---- Return Result ----
        return {
            "data": data,
            "ats_score": ats["ats_score"],
            "ats_breakdown": ats["ats_breakdown"],
            "word_count": ats["word_count"],
        }

    except Exception as e:
        import traceback
        print("❌ Error in process_resume_file:", traceback.format_exc())
        return {"error": str(e)}


# -------------------------
# Text-only extractor (use when you pass resume text instead of PDF)
# -------------------------
async def extract_resume_data(text: str):
    """
    Extract structured resume data using OpenRouter AI.
    Returns parsed JSON with keys like name, email, education, etc.
    """
    if not openrouter_client:
        return {}


    prompt = f"""
Extract structured resume info and return valid JSON ONLY.

CRITICAL RULE FOR CERTIFICATES:
  The "certificates" array must be extracted ONLY from sections whose heading (case-insensitive)
  matches one of the following variations. Ignore any certificate-like text outside these sections.
  Allowed headings:
    ["CERTIFICATE", "CERTIFICATES", "CERTIFICATION", "CERTIFICATIONS",
     "COURSES", "TRAININGS", "ACHIEVEMENTS", "SKILL CERTIFICATIONS",
     "ONLINE COURSES", "LICENSES", "CREDENTIALS"].

Return JSON in this exact structure:
{{
  "name": "", "email": "", "phone": "",
  "linkedin": "", "github": "", "leetcode": "", "codechef": "",
  "languages": [],
  "education": {{
      "10th": {{"school": "", "location": "", "year": "", "percentage": ""}},
      "12th": {{"school": "", "location": "", "year": "", "percentage": ""}},
      "bachelor": {{"institute": "", "location": "", "degree": "", "expected_graduation": "", "cgpa": ""}}
  }},
  "skills": {{"technical": [], "soft": []}},
  "certificates": [],
  "role_match": "",
  "summary": ""
}}

Resume text:
{text}
"""
    try:
        completion = openrouter_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "system", "content": "Return valid JSON only."}, {"role": "user", "content": prompt}],
            temperature=0.2,
        )
        raw = completion.choices[0].message.content.strip()
    except Exception as exc:
        print("⚠️ OpenRouter request failed in extract_resume_data:", exc)
        return {}

    raw_clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(raw_clean)
    except Exception:
        print("⚠️ Invalid JSON returned by AI (extract_resume_data):", raw_clean)
        return {}

    # Normalize languages same as process function, without guessing
    raw_langs = data.get("languages", [])
    if isinstance(raw_langs, str):
        raw_langs = re.split(r"[,;/]| and ", raw_langs)
    langs = normalize_languages([lang.strip() for lang in raw_langs if lang and str(lang).strip()])

    # If AI did not return languages, leave this empty instead of guessing.
    data["languages"] = langs
    return data
