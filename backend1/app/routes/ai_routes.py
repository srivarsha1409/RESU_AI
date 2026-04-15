# app/routes/ai_routes.py
from fastapi import APIRouter, HTTPException, Request
from app.config import openrouter_client as client
import json

router = APIRouter(prefix="/ai", tags=["AI Chat"])


@router.post("/chat")
async def chat_ai(request: Request):
    """
    AI chat assistant for resume-based Q&A.
    Uses OpenRouter GPT model and supports structured resume data context.
    """
    try:
        body = await request.json()
        query = body.get("query")
        resume_data = body.get("resume_data", {})

        if not query:
            raise HTTPException(status_code=400, detail="Missing query")

        # 🧠 Create context prompt
        prompt = f"""
        You are a career AI assistant. 
        Use the following resume data to provide helpful, accurate, and personalized career advice.

        Resume Data:
        {json.dumps(resume_data, indent=2)}

        User Question:
        {query}
        """

        # ✅ New syntax for chat completions
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Be clear, concise, and helpful."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=512,
        )

        # ✅ Extract response safely
        answer = response.choices[0].message.content.strip()

        return {"response": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
