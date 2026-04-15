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
Extract structured resume info and return valid JSON ONLY:
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
                max_tokens=2000,
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

        # ---- Normalize technical skills (split combined strings) ----
        skills_block = data.get("skills", {}) or {}
        raw_tech_skills = skills_block.get("technical", []) or []
        normalized_tech = []
        for item in raw_tech_skills:
            for part in re.split(r"[,;/]|\s*\|\s*| and ", str(item)):
                part_clean = part.strip()
                if part_clean and part_clean not in normalized_tech:
                    normalized_tech.append(part_clean)
        skills_block["technical"] = normalized_tech
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
Extract structured resume info and return valid JSON ONLY:
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
{prompt_text}
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
