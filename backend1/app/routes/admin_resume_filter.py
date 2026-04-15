from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
from app.helpers.resume_helper import process_resume_file, normalize_languages
from io import BytesIO
import json
import re
import asyncio

router = APIRouter()

# ---------------------------------------------------------
# 🔧 Helper classes & functions
# ---------------------------------------------------------
class InMemoryUpload:
    """Lightweight UploadFile-like wrapper over raw bytes for reprocessing.

    This avoids 'I/O operation on closed file' errors by keeping the content in
    memory and exposing an async read() method compatible with process_resume_file.
    """

    def __init__(self, filename: str, data: bytes):
        self.filename = filename
        self._data = data
        self._consumed = False

    async def read(self):  # type: ignore[override]
        if self._consumed:
            return b""
        self._consumed = True
        return self._data


def parse_percentage(value):
    """Convert string percentage (like '92.6%') to float."""
    if not value:
        return 0.0
    try:
        return float(str(value).replace("%", "").strip())
    except Exception:
        return 0.0


def parse_cgpa(value):
    """Convert CGPA string (like '8.32 (upto 5th semester)') to float."""
    if not value:
        return 0.0
    try:
        match = re.search(r"\d+(\.\d+)?", str(value))
        return float(match.group()) if match else 0.0
    except Exception:
        return 0.0


# ---------------------------------------------------------
# 🧠 Real-Time Resume Filter Streaming Endpoint
# ---------------------------------------------------------
@router.post("/filter_uploaded_resumes_stream")
async def filter_uploaded_resumes_stream(
    files: List[UploadFile] = File(...),
    cgpa: Optional[float] = Form(None),
    cgpa_max: Optional[float] = Form(None),
    tenth: Optional[float] = Form(None),
    tenth_max: Optional[float] = Form(None),
    twelfth: Optional[float] = Form(None),
    twelfth_max: Optional[float] = Form(None),
    ats: Optional[float] = Form(None),
    skills: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    degree: Optional[str] = Form(None),
    area_of_interest: Optional[str] = Form(None),
):
    """
    Stream resume filtering progress file by file, returning live updates to the frontend.
    Each SSE (Server-Sent Event) message includes partial progress and cumulative results.
    """
    skill_list = [s.strip().lower() for s in skills.split(",")] if skills else []
    area_filters = [a.strip().lower() for a in area_of_interest.split(",")] if area_of_interest else []

    # Normalize requested language filter using the same logic as resume parsing
    language_filters = []
    if language:
        language_filters = [
            l.lower().strip() for l in normalize_languages(language) if l
        ]
    department = department.lower().strip() if department else None
    degree = degree.lower().strip() if degree else None
    total_files = len(files)

    async def event_stream():
        results = []
        processed_count = 0

        for i, file in enumerate(files, start=1):
            try:
                # Read the original upload into memory once, then wrap it in a
                # lightweight object with an async read() method. This avoids
                # reusing the underlying Starlette UploadFile (which may be
                # closed or exhausted during streaming).
                original_bytes = await file.read()
                if not original_bytes:
                    print(f"⚠️ Empty file skipped: {file.filename}")
                    continue

                processing_copy = InMemoryUpload(filename=file.filename, data=original_bytes)
                parsed = await process_resume_file(processing_copy)
                if not parsed or parsed.get("error"):
                    print(f"⚠️ Parsing failed for: {file.filename}")
                    continue

                data = parsed.get("data", {})
                ats_score = parsed.get("ats_score", 0)
                edu = data.get("education", {}) or {}

                # Languages are already normalized in process_resume_file; use as-is for display,
                # but also keep a lowercase copy for filter matching.
                langs = [lang for lang in data.get("languages", []) if lang]
                langs_lower = [lang.lower().strip() for lang in langs]

                # Normalize technical skills so that entries like
                # "Java | OOPS | Multithreading | JDBC | MySQL" become
                # ["Java", "OOPS", "Multithreading", "JDBC", "MySQL"].
                raw_tech_skills = (data.get("skills", {}) or {}).get("technical", []) or []
                display_tech_skills = []
                for item in raw_tech_skills:
                    for part in re.split(r"\s*\|\s*", str(item)):
                        part_clean = part.strip()
                        if part_clean and part_clean not in display_tech_skills:
                            display_tech_skills.append(part_clean)

                # Use lowercased version of normalized skills for matching filters
                tech_skills = [s.lower() for s in display_tech_skills]

                interest_areas = [a.lower().strip() for a in data.get("skills", {}).get("area_of_interest", []) if a]
                email = data.get("email") or parsed.get("email")
                phone = data.get("phone") or parsed.get("phone")

                # Convert numeric fields
                tenth_value = parse_percentage(edu.get("10th", {}).get("percentage"))
                twelfth_value = parse_percentage(edu.get("12th", {}).get("percentage"))
                cgpa_value = parse_cgpa(edu.get("bachelor", {}).get("cgpa"))

                # Apply filters (min/max ranges)
                if cgpa is not None and cgpa_value < cgpa:
                    continue
                if cgpa_max is not None and cgpa_value > cgpa_max:
                    continue
                if tenth is not None and tenth_value < tenth:
                    continue
                if tenth_max is not None and tenth_value > tenth_max:
                    continue
                if twelfth is not None and twelfth_value < twelfth:
                    continue
                if twelfth_max is not None and twelfth_value > twelfth_max:
                    continue
                if ats and ats_score < ats:
                    continue
                # Language filter: check against normalized language tokens
                if language_filters and not any(
                    any(f in l for f in language_filters) for l in langs_lower
                ):
                    continue
                if department and department not in str(edu.get("bachelor", {}).get("degree", "")).lower():
                    continue
                if degree and degree not in str(edu.get("bachelor", {}).get("degree", "")).lower():
                    continue
                if skill_list and not all(any(skill in s for s in tech_skills) for skill in skill_list):
                    continue
                if area_filters and not any(
                    any(af in area for af in area_filters) for area in interest_areas
                ):
                    continue

                # Build final filtered record
                skills_block = data.get("skills", {}) or {}
                skills_block["technical"] = display_tech_skills

                result = {
                    "filename": file.filename,
                    "name": data.get("name"),
                    "email": email,
                    "phone": phone,
                    "ats_score": ats_score,
                    "education": edu,
                    "skills": skills_block,
                    "languages": langs,
                    "area_of_interest": skills_block.get("area_of_interest", []),
                }
                results.append(result)
                processed_count += 1

                # Send partial progress
                progress_payload = {
                    "progress": i,
                    "processed": processed_count,
                    "total": total_files,
                    "latest_filename": file.filename,
                    "latest_name": data.get("name"),
                    "results_so_far": results,
                }
                yield f"data: {json.dumps(progress_payload)}\n\n"
                await asyncio.sleep(0.05)

            except Exception as e:
                print(f"⚠️ Error processing {file.filename}: {e}")
                continue

        # Final event — marks completion
        final_payload = {"done": True, "results": results, "count": len(results)}
        yield f"data: {json.dumps(final_payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------
# 🧠 Simple Resume Filtering Endpoint (non-streaming)
# ---------------------------------------------------------
@router.post("/filter_uploaded_resumes")
async def filter_uploaded_resumes(
    files: List[UploadFile] = File(...),
    cgpa: Optional[float] = Form(None),
    cgpa_max: Optional[float] = Form(None),
    tenth: Optional[float] = Form(None),
    tenth_max: Optional[float] = Form(None),
    twelfth: Optional[float] = Form(None),
    twelfth_max: Optional[float] = Form(None),
    ats: Optional[float] = Form(None),
    skills: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    degree: Optional[str] = Form(None),
):
    results = []
    skill_list = [s.strip().lower() for s in skills.split(",")] if skills else []

    # Normalize filters
    language = language.lower().strip() if language else None
    department = department.lower().strip() if department else None
    degree = degree.lower().strip() if degree else None

    for file in files:
        parsed = await process_resume_file(file)
        if not parsed or parsed.get("error"):
            continue

        data = parsed.get("data", {})
        ats_score = parsed.get("ats_score", 0)
        edu = data.get("education", {}) or {}
        langs = [lang.lower().strip() for lang in data.get("languages", []) if lang]
        tech_skills = [
            s.lower().strip()
            for s in (data.get("skills", {}) or {}).get("technical", [])
            if s
        ]

        # Convert numeric fields
        tenth_value = parse_percentage(edu.get("10th", {}).get("percentage"))
        twelfth_value = parse_percentage(edu.get("12th", {}).get("percentage"))
        cgpa_value = parse_cgpa(edu.get("bachelor", {}).get("cgpa"))

        # Filter logic: ranges + ats
        if cgpa is not None and cgpa_value < cgpa:
            continue
        if cgpa_max is not None and cgpa_value > cgpa_max:
            continue
        if tenth is not None and tenth_value < tenth:
            continue
        if tenth_max is not None and tenth_value > tenth_max:
            continue
        if twelfth is not None and twelfth_value < twelfth:
            continue
        if twelfth_max is not None and twelfth_value > twelfth_max:
            continue
        if ats is not None and ats_score < ats:
            continue

        # Language filter (any match)
        if language and not any(language in l for l in langs):
            continue

        # Department / degree
        degree_text = str(edu.get("bachelor", {}).get("degree", "")).lower()
        if department and department not in degree_text:
            continue
        if degree and degree not in degree_text:
            continue

        # Skills filter: all required skills must appear somewhere in technical skills
        if skill_list and not all(any(skill in s for s in tech_skills) for skill in skill_list):
            continue

        results.append(
            {
                "filename": file.filename,
                "name": data.get("name"),
                "ats_score": ats_score,
                "education": edu,
                "skills": data.get("skills", {}),
                "languages": langs,
                "areas_of_interest": data.get("areas_of_interest", []),
            }
        )

    return {"count": len(results), "results": results}
