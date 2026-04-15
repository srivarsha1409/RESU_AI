from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.helpers.resume_helper import process_resume_file, normalize_languages
from io import BytesIO
import json
import re
import asyncio

router = APIRouter()

from app.config import SECRET_KEY, ALGORITHM
import jwt

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


class UpdateSkillsetRequest(BaseModel):
    """Request model for updating skillset data."""
    sheets: Dict[str, List[Dict[str, Any]]]


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
    authorization: str | None = Header(default=None),
):
    # Authorization: expect 'Bearer <token>' and require role == 'trainer'
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")
    role = payload.get("role")
    if role != "trainer":
        raise HTTPException(status_code=403, detail="Trainer role required to access this endpoint")
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
    area_of_interest: Optional[str] = Form(None),
    authorization: str | None = Header(default=None),
):
    # Authorization check (require trainer role)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")
    role = payload.get("role")
    if role != "trainer":
        raise HTTPException(status_code=403, detail="Trainer role required to access this endpoint")
    
    results = []
    skill_list = [s.strip().lower() for s in skills.split(",")] if skills else []
    area_filters = [a.strip().lower() for a in area_of_interest.split(",")] if area_of_interest else []

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

        # --- Human languages ---
        # process_resume_file already normalizes languages (via normalize_languages),
        # so we use that list as-is for display and keep a lowercased copy for filters.
        display_langs = [lang for lang in data.get("languages", []) if lang]
        langs_lower = [lang.lower().strip() for lang in display_langs]

        # --- Technical skills ---
        # Start from the AI "skills.technical" block and derive a normalized list
        # for filtering, while returning a cleaned display list in the response.
        raw_tech_skills = (data.get("skills", {}) or {}).get("technical", []) or []
        display_tech_skills: list[str] = []
        seen_tech = set()
        for item in raw_tech_skills:
            for part in re.split(r"\s*\|\s*", str(item)):
                value = part.strip()
                if not value:
                    continue
                key = value.lower()
                if key not in seen_tech:
                    seen_tech.add(key)
                    display_tech_skills.append(value)

        # Lowercased copy for matching Required Skills filters
        tech_skills = [s.lower() for s in display_tech_skills]

        # --- Areas of interest ---
        raw_aoi = (data.get("skills", {}) or {}).get("area_of_interest", []) or []
        display_aoi = [a for a in raw_aoi if a]
        interest_areas_lower = [a.lower().strip() for a in raw_aoi if a]

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

        # Language filter (any match, case-insensitive)
        if language and not any(language in l for l in langs_lower):
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

        # Area of interest filter: any match across AOI list (case-insensitive)
        if area_filters and not any(
            any(af in area for af in area_filters) for area in interest_areas_lower
        ):
            continue

        email = data.get("email") or parsed.get("email")
        phone = data.get("phone") or parsed.get("phone")

        # Build skills block for response: reuse original skills but override
        # technical with the cleaned display list so frontend sees normalized skills.
        skills_block = data.get("skills", {}) or {}
        skills_block["technical"] = display_tech_skills

        results.append(
            {
                "filename": file.filename,
                "name": data.get("name"),
                "email": email,
                "phone": phone,
                "ats_score": ats_score,
                "education": edu,
                "skills": skills_block,
                "languages": display_langs,
                "area_of_interest": display_aoi,
            }
        )

    return {"count": len(results), "results": results}

# ---------------------------------------------------------
# 📊 Trainer Skillset Management
# ---------------------------------------------------------
@router.post("/upload_skillset")
async def upload_skillset(
    file: UploadFile = File(...),
    mode: str = Form("replace"),
    authorization: str | None = Header(default=None),
):
    """Upload Companies Skillset Excel file (Trainer only).
    
    Requires trainer role. Saves the file to backend root as "Skillset of Companies Visited.xlsx".
    Mode: 'replace' (default) or 'append' to add sheets to existing file.
    This file is then served to users via /user/skillset and /user/skillset_json.
    """
    # Authorization check (require trainer role)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required. Please log in again.")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Please log in again.")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    role = payload.get("role")
    if role != "trainer":
        raise HTTPException(status_code=403, detail="Trainer role required to access this endpoint")
    
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file extension
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .xls file only")
    
    try:
        from pathlib import Path
        import pandas as pd
        from io import BytesIO
        
        # Save to backend root as "Skillset of Companies Visited.xlsx"
        root = Path(__file__).resolve().parents[2]
        skillset_path = root / "Skillset of Companies Visited.xlsx"
        
        # Read uploaded file content
        content = await file.read()
        
        # Validate file is not empty
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Determine engine based on file extension
        engine = 'openpyxl' if file.filename.lower().endswith('.xlsx') else 'xlrd'
        
        # Validate it's a valid Excel file by trying to read it
        try:
            test_read = pd.read_excel(BytesIO(content), sheet_name=None, engine=engine)
            if not test_read or len(test_read) == 0:
                raise HTTPException(status_code=400, detail="Excel file contains no sheets")
        except Exception as read_err:
            # If file validation fails, try alternative engine
            alt_engine = 'xlrd' if engine == 'openpyxl' else 'openpyxl'
            try:
                test_read = pd.read_excel(BytesIO(content), sheet_name=None, engine=alt_engine)
                if not test_read or len(test_read) == 0:
                    raise HTTPException(status_code=400, detail="Excel file contains no sheets")
                engine = alt_engine  # Use the working engine
            except Exception as alt_error:
                raise HTTPException(status_code=400, detail=f"Invalid Excel file. Please ensure you're uploading a real Excel file (.xlsx or .xls), not a CSV. Error: {str(read_err)}")
        
        if mode == "append" and skillset_path.exists():
            # Append mode: merge sheets from uploaded file with existing file
            try:
                # Read existing file - try both engines
                try:
                    existing_dfs = pd.read_excel(skillset_path, sheet_name=None, engine='openpyxl')
                except:
                    existing_dfs = pd.read_excel(skillset_path, sheet_name=None, engine='xlrd')
                
                # Read new file with the validated working engine
                new_dfs = pd.read_excel(BytesIO(content), sheet_name=None, engine=engine)
                
                # Merge: new sheets override existing ones with same name
                merged_dfs = {**existing_dfs, **new_dfs}
                
                # Write merged data back with openpyxl
                with pd.ExcelWriter(skillset_path, engine='openpyxl') as writer:
                    for sheet_name, df in merged_dfs.items():
                        df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                return {
                    "status": "success",
                    "message": f"Skillset appended successfully! {len(new_dfs)} sheet(s) added/updated ✅",
                    "mode": "append",
                    "sheets_added": list(new_dfs.keys()),
                    "total_sheets": len(merged_dfs)
                }
            except Exception as append_error:
                raise HTTPException(status_code=500, detail=f"Failed to append skillset: {str(append_error)}")
        else:
            # Replace mode: overwrite existing file
            with open(skillset_path, "wb") as f:
                f.write(content)
            
            return {
                "status": "success",
                "message": "Skillset file uploaded successfully ✅",
                "mode": "replace",
                "filename": file.filename,
                "path": str(skillset_path)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload skillset: {str(e)}")


@router.get("/skillset_preview")
async def skillset_preview(authorization: str | None = Header(default=None)):
    """Get preview of current skillset Excel file (Trainer only).
    
    Returns JSON of all sheets in the skillset file.
    """
    # Authorization check (require trainer role)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required. Please log in again.")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Please log in again.")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    role = payload.get("role")
    if role != "trainer":
        raise HTTPException(status_code=403, detail="Trainer role required to access this endpoint")
    
    try:
        from pathlib import Path
        import pandas as pd
        
        root = Path(__file__).resolve().parents[2]
        skillset_path = root / "Skillset of Companies Visited.xlsx"
        
        if not skillset_path.exists():
            return {"sheets": {}, "message": "No skillset file uploaded yet"}
        
        # Try openpyxl first, fall back to xlrd for older .xls files
        try:
            dfs = pd.read_excel(skillset_path, sheet_name=None, engine='openpyxl')
        except Exception as e1:
            try:
                dfs = pd.read_excel(skillset_path, sheet_name=None, engine='xlrd')
            except Exception as e2:
                raise HTTPException(status_code=500, detail=f"Failed to read Excel file. Please upload a valid .xlsx or .xls file. Error: {str(e1)}")
        
        sheets = {name: df.fillna("").to_dict(orient="records") for name, df in dfs.items()}
        
        return {"status": "success", "sheets": sheets}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read skillset: {str(e)}")


@router.post("/update_skillset")
async def update_skillset(request: UpdateSkillsetRequest, authorization: str | None = Header(default=None)):
    """Update skillset Excel file with edited data (Trainer only).
    
    Accepts JSON with edited sheet data and updates the Excel file.
    """
    # Authorization check (require trainer role)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required. Please log in again.")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Please log in again.")
    token = parts[1]
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    role = jwt_payload.get("role")
    if role != "trainer":
        raise HTTPException(status_code=403, detail="Trainer role required to access this endpoint")
    
    try:
        from pathlib import Path
        import pandas as pd
        
        root = Path(__file__).resolve().parents[2]
        skillset_path = root / "Skillset of Companies Visited.xlsx"
        
        # Extract sheets from request payload
        sheets_data = request.sheets
        
        if not sheets_data:
            raise HTTPException(status_code=400, detail="No sheets data provided")
        
        # Convert sheets data to DataFrames and save
        with pd.ExcelWriter(skillset_path, engine='openpyxl') as writer:
            for sheet_name, rows in sheets_data.items():
                if rows:  # Only write if sheet has data
                    df = pd.DataFrame(rows)
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        return {"status": "success", "message": "Skillset updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update skillset: {str(e)}")