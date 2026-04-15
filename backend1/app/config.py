# app/config.py
import os
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient
from openai import OpenAI

# Load environment variables
_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
if _ENV_PATH.exists():
    load_dotenv(dotenv_path=_ENV_PATH)
else:
    load_dotenv()

# --- JWT Auth Settings ---
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-dev-key-change-me")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# --- MongoDB ---
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "resume_analyzer")

db = None
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
    except Exception as e:
        print("⚠️ MongoDB connection failed:", e)
else:
    print("⚠️ MONGO_URI not found in .env")

# --- OpenRouter (AI client) ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

openrouter_client = None
if OPENROUTER_API_KEY:
    openrouter_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
else:
    print("⚠️ OPENROUTER_API_KEY missing from .env")

# --- GitHub Token ---
GITHUB_TOKEN_ENV = os.getenv("GITHUB_TOKEN")
if not GITHUB_TOKEN_ENV:
    print("⚠️ GITHUB_TOKEN not found in .env (GitHub API features may be limited)")
