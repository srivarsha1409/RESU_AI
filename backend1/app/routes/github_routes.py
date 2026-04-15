# app/routes/github_routes.py
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from app.helpers.github_helper import get_github_repo_counts, get_pr_metrics
from app.helpers.resume_helper import extract_username_from_input  # reuse same helper
from app.config import GITHUB_TOKEN_ENV

router = APIRouter()

@router.get("/analyze_github/{user_input}")
def analyze_github(user_input: str, token: str = Query(None, description="GitHub token (optional)")):
    username = extract_username_from_input(user_input)
    if not username:
        return JSONResponse({"error": "Could not parse GitHub username from input"}, status_code=400)

    token_to_use = token or GITHUB_TOKEN_ENV
    if not token_to_use:
        return JSONResponse(
            {"error": "GitHub token missing. Pass ?token=... or set GITHUB_TOKEN env variable"},
            status_code=400,
        )

    # Test token validity first
    try:
        import requests
        headers = {"Authorization": f"Bearer {token_to_use}"}
        test_response = requests.get("https://api.github.com/user", headers=headers, timeout=5)
        if test_response.status_code == 401:
            return JSONResponse(
                {"error": "GitHub token is invalid or expired. Please generate a new token."},
                status_code=400,
            )
    except Exception:
        pass

    gql = get_github_repo_counts(username, token_to_use)
    if "error_graphql" in gql:
        return JSONResponse(gql, status_code=400)

    pr = get_pr_metrics(username, token_to_use)
    if "error_pr_api" in pr:
        # still return GraphQL data if PR metrics failed
        return JSONResponse(pr, status_code=400)

    combined = {**gql, **pr}
    return {"username": username, "github_metrics": combined}
