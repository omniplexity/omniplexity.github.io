from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

# -----------------------------------------------------------
# CORS SETTINGS — update origins as needed
# -----------------------------------------------------------
allowed_origins = [
    "https://omniplexity.github.io",         # GitHub Pages
    "https://rossie-chargeful-plentifully.ngrok-free.dev",  # Replace at runtime
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------
# REQUEST & RESPONSE MODELS
# -----------------------------------------------------------

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str


# -----------------------------------------------------------
# SIMPLE HEALTH CHECK (GET)
# -----------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "Backend is running"}


# -----------------------------------------------------------
# MAIN MODEL CHAT ENDPOINT (POST)
# -----------------------------------------------------------
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_message = request.message

    # LM Studio API endpoint
    lm_studio_url = "http://10.0.0.198:11434/api/generate"

    payload = {
        "model": "your-model-name-here",  # Replace if needed
        "prompt": user_message,
        "stream": False
    }

    try:
        response = requests.post(lm_studio_url, json=payload)
        response.raise_for_status()
        data = response.json()

        # LM Studio may respond with "response" or "text"
        reply_text = data.get("response") or data.get("text") or ""

        return ChatResponse(response=reply_text)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with LM Studio: {str(e)}"
        )
