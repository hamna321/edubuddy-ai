"""
EduBuddy ML service — FastAPI.

Endpoints:
  GET  /health         -> service + model readiness
  POST /predict-grade  -> {features:{...}}            -> XGBoost grade band
  POST /emotion-text   -> {text} | {messages:[...]}   -> DistilBERT emotion

Run:  python app.py       (or: uvicorn app:app --port 5000)
"""

import os 

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import config
import grade
import emotion

app = FastAPI(title="EduBuddy ML Service", version="1.0")

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_origins = os.environ.get("FRONTEND_ORIGIN", "")
if frontend_origins:
    allowed_origins.extend(
        origin.strip()
        for origin in frontend_origins.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

def check_key(x_api_key: Optional[str]):
    if config.API_KEY and x_api_key != config.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


class GradeReq(BaseModel):
    features: Dict[str, Any]


class EmotionReq(BaseModel):
    text: Optional[str] = None
    messages: Optional[List[str]] = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "grade_ready": grade.is_ready(),
        "emotion_ready": emotion.is_ready(),
    }


@app.post("/predict-grade")
def predict_grade(req: GradeReq, x_api_key: Optional[str] = Header(default=None)):
    check_key(x_api_key)
    try:
        return grade.predict(req.features)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emotion-text")
def emotion_text(req: EmotionReq, x_api_key: Optional[str] = Header(default=None)):
    check_key(x_api_key)
    try:
        if req.messages:
            return emotion.classify_conversation(req.messages)
        return emotion.classify(req.text or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print(f"\n  EduBuddy ML service -> http://localhost:{config.PORT}")
    print(f"  grade_ready={grade.is_ready()}  emotion_ready={emotion.is_ready()}\n")
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
