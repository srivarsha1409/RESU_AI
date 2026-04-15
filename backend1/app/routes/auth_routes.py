# app/routes/auth_routes.py
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import bcrypt
import os
import certifi
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime, timedelta
import jwt
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

load_dotenv()

router = APIRouter(tags=["Authentication"])

# -------------------------------
# MongoDB Connection (SSL Fixed)
# -------------------------------
try:
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    tls_params = {}
    if uri and (uri.startswith("mongodb+srv://") or "ssl=true" in uri.lower()):
        tls_params = {
            "tls": True,
            "tlsCAFile": certifi.where(),
            "tlsAllowInvalidCertificates": True,
        }
    client = MongoClient(uri, serverSelectionTimeoutMS=5000, **tls_params)
    db = client[db_name]
    users = db["users"]
    print("✅ MongoDB connection established successfully!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    raise e


# -------------------------------
# Pydantic Model
# -------------------------------
class LoginModel(BaseModel):
    email: str
    password: str

class RegisterModel(BaseModel):
    email: str
    password: str
    role: str | None = "user"

class SetPasswordModel(BaseModel):
    email: str
    password: str
    role: str | None = None


# -------------------------------
# Helpers
# -------------------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def _convert_objectid(obj):
    """
    Recursively convert any ObjectId instances in dict/list to their string form.
    """
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                out[k] = str(v)
            else:
                out[k] = _convert_objectid(v)
        return out
    elif isinstance(obj, list):
        return [_convert_objectid(x) for x in obj]
    else:
        return obj


def _sanitize_user_doc(doc: dict):
    """
    Convert ObjectId values to strings and remove sensitive fields (password).
    Returns a new dict safe for JSON responses.
    """
    if not doc:
        return doc
    # convert objectids recursively
    safe = _convert_objectid(doc)
    # remove password if present
    safe.pop("password", None)
    return safe


# -------------------------------
# Login Route
# -------------------------------
@router.post("/login")
def login_user(user: LoginModel):
    """
    Login user (case-insensitive email lookup).
    Returns sanitized user document (no password) and role on success.
    Handles both plain-text stored passwords and bcrypt-hashed passwords.
    """
    try:
        found = users.find_one({"email": {"$regex": f"^{user.email}$", "$options": "i"}})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    if not found:
        raise HTTPException(status_code=404, detail="User not found ❌")

    stored_password = found.get("password")
    if not stored_password:
        # defensive: user record without password
        raise HTTPException(status_code=401, detail="Invalid password ❌")

    def success_payload(found_user):
        user_safe = _sanitize_user_doc(found_user)
        role = user_safe.get("role", "user")
        # include minimal data in token (e.g., user id and role)
        token_data = {"sub": user_safe.get("_id"), "email": user_safe.get("email"), "role": role}
        access_token = create_access_token(token_data)
        return {
            "status": "success",
            "message": f"Login successful as {role} ✅",
            "role": role,
            "user": user_safe,
            "access_token": access_token,
            "token_type": "bearer",
        }

    # Plain text match (common in dev setups)
    try:
        if stored_password == user.password:
            return success_payload(found)
    except Exception:
        # ignore unexpected types; fallthrough to bcrypt check
        pass

    # Hashed password (bcrypt)
    try:
        # stored_password and user.password should be bytes for checkpw
        if isinstance(stored_password, str):
            stored_bytes = stored_password.encode("utf-8")
        else:
            stored_bytes = stored_password
        if bcrypt.checkpw(user.password.encode("utf-8"), stored_bytes):
            return success_payload(found)
    except Exception:
        # If bcrypt fails (bad format), report invalid password rather than 500
        raise HTTPException(status_code=401, detail="Invalid password ❌")

    # If neither check matched
    raise HTTPException(status_code=401, detail="Invalid password ❌")


# -------------------------------
# Register Route
# -------------------------------
@router.post("/register")
def register_user(new_user: RegisterModel):
    """
    Register a new user with bcrypt password hashing.
    Email check is case-insensitive; returns sanitized user and role.
    """
    try:
        existing = users.find_one({"email": {"$regex": f"^{new_user.email}$", "$options": "i"}})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    if existing:
        raise HTTPException(status_code=409, detail="User already exists ❌")

    # hash password
    hashed = bcrypt.hashpw(new_user.password.encode("utf-8"), bcrypt.gensalt())
    doc = {
        "email": new_user.email,
        "password": hashed,
        "role": (new_user.role or "user").lower(),
    }

    try:
        result = users.insert_one(doc)
        created = users.find_one({"_id": result.inserted_id})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_safe = _sanitize_user_doc(created)
    return {"status": "success", "message": "User registered ✅", "role": user_safe.get("role", "user"), "user": user_safe}


# -------------------------------
# Set/Update Password (Upsert)
# -------------------------------
@router.post("/set_password")
def set_password(payload: SetPasswordModel):
    """
    Set or update a user's password. If the user doesn't exist, create it.
    Accepts optional role to set/update. Uses bcrypt hashing.
    Case-insensitive email matching.
    """
    email_ci = {"$regex": f"^{payload.email}$", "$options": "i"}

    try:
        existing = users.find_one({"email": email_ci})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")

    hashed = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())

    if existing:
        update_doc = {"$set": {"password": hashed}}
        if payload.role:
            update_doc["$set"]["role"] = payload.role.lower()
        try:
            users.update_one({"_id": existing["_id"]}, update_doc)
            updated = users.find_one({"_id": existing["_id"]})
        except PyMongoError:
            raise HTTPException(status_code=503, detail="Database unavailable")
        safe = _sanitize_user_doc(updated)
        return {"status": "success", "message": "Password updated ✅", "role": safe.get("role", "user"), "user": safe}
    else:
        doc = {
            "email": payload.email,
            "password": hashed,
            "role": (payload.role or "user").lower(),
        }
        try:
            result = users.insert_one(doc)
            created = users.find_one({"_id": result.inserted_id})
        except PyMongoError:
            raise HTTPException(status_code=503, detail="Database unavailable")
        safe = _sanitize_user_doc(created)
        return {"status": "success", "message": "User created ✅", "role": safe.get("role", "user"), "user": safe}


# -------------------------------
# Verify Token Route
# -------------------------------
@router.get("/verify_token")
def verify_token(authorization: str | None = Header(default=None)):
    """Verify a JWT access token passed in the Authorization header.

    Expected header format: "Bearer <token>".
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Token verification failed ❌")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Token verification failed ❌")

    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed ❌")

    return {"status": "success", "message": "Token is valid ✅", "data": payload}
