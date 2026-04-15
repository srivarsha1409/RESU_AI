# app/routes/analyze_all.py
# Combined route extracted from main.py — merges all analyses into one response.

from fastapi import APIRouter, File, UploadFile, Query
from fastapi.responses import JSONResponse

from app.helpers.resume_helper import process_resume_file, extract_username_from_input
from app.helpers.github_helper import get_github_repo_counts, get_pr_metrics
from app.config import GITHUB_TOKEN_ENV
from app.routes.leetcode_routes import analyze_leetcode
from app.routes.codechef_routes import analyze_codechef

router = APIRouter()

@router.post("/analyze_all")
async def analyze_all(
    file: UploadFile = File(...),
    github: str = Query(None),
    leetcode: str = Query(None),
    codechef: str = Query(None),
    token: str = Query(None),
):
    """
    Upload resume + optionally analyze GitHub / LeetCode / CodeChef.
    Returns a combined JSON object.
    """
    results = {}

    # ---------------- Resume ----------------
    resume_result = await process_resume_file(file)
    if isinstance(resume_result, dict) and resume_result.get("error"):
        return JSONResponse(resume_result, status_code=400)
    results["resume"] = resume_result

    # ---------------- GitHub ----------------
    if github:
        try:
            username = extract_username_from_input(github)
            if not username:
                results["github_error"] = "Could not parse GitHub username from input"
            else:
                token_to_use = token or GITHUB_TOKEN_ENV
                if not token_to_use:
                    results["github_error"] = "GitHub token missing. Pass ?token=... or set GITHUB_TOKEN env variable"
                else:
                    gql = get_github_repo_counts(username, token_to_use)
                    if "error_graphql" in gql:
                        results["github_error"] = gql.get("error_graphql")
                    else:
                        pr = get_pr_metrics(username, token_to_use)
                        if "error_pr_api" in pr:
                            results["github_error"] = pr.get("error_pr_api")
                        else:
                            combined = {**gql, **pr}
                            results["github"] = {"username": username, "github_metrics": combined}
        except Exception as e:
            results["github_error"] = str(e)

    # ---------------- LeetCode ----------------
    if leetcode:
        try:
            lc_data = analyze_leetcode(leetcode)
            results["leetcode"] = lc_data
        except Exception as e:
            results["leetcode_error"] = str(e)

    # ---------------- CodeChef ----------------
    if codechef:
        try:
            cc_data = analyze_codechef(codechef)
            results["codechef"] = cc_data
        except Exception as e:
            results["codechef_error"] = str(e)

    return results
