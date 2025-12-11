from fastapi import FastAPI
from routes.ai import router as ai_router

app = FastAPI()

app.include_router(ai_router, prefix="/api/ai")

@app.get("/")
def root():
    return {"status": "Backend is running"}
