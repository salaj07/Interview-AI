"""
AI Mock Interviewer - FastAPI Application
"""
from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import FRONTEND_URL, PORT
from app.routers.interview import router as interview_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_interviewer")

app = FastAPI(
    title="AI Mock Interviewer Studio API",
    description="Adaptive AI-powered mock interviewer with real-time evaluation, audio STT/TTS, and comprehensive rubric scoring.",
    version="1.0.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include interview router both at root and under /api
app.include_router(interview_router)
app.include_router(interview_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "AI Mock Interviewer API",
        "status": "online",
        "endpoints": {
            "start": "/interview/start",
            "answer": "/interview/answer",
            "end": "/interview/end",
            "presets": "/interview/presets",
            "recent_reports": "/interview/reports/recent",
            "tts": "/interview/tts",
            "websocket": "/interview/ws/{session_id}"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": "live"}

