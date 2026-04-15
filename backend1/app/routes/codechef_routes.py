# app/routes/codechef_routes.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.helpers.codechef_helper import extract_codechef_paths_and_badges
from app.helpers.resume_helper import extract_username_from_input
from urllib.parse import urlparse

router = APIRouter()

@router.get("/analyze_codechef/{user_input}")
def analyze_codechef(user_input: str):
    # Extract username from input (handles both usernames and full URLs)
    username = extract_username_from_input(user_input)
    if not username:
        return JSONResponse({"error": "Could not parse CodeChef username from input"}, status_code=400)
    
    profile_url = f"https://www.codechef.com/users/{username}"
    data = extract_codechef_paths_and_badges(profile_url)
    if "error" in data:
        # Return a fallback response with basic structure
        return {
            "profile": {
                "Profile_URL": profile_url,
                "Rating": 0,
                "Star_Rating": "Unrated",
                "Global_Rank": 0,
                "Country_Rank": 0,
                "Learning_Paths": [],
                "Practice_Paths": [],
                "Badges": [],
                "Total_Solved": 0,
                "error": data.get("error", "Failed to fetch CodeChef data")
            }
        }
    return {"profile": data}
