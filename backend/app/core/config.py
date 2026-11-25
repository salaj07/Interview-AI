import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

PROJECT_ENVIRONMENT = os.getenv("PROJECT_ENVIRONMENT", "DEVELOPMENT").upper()
PORT = int(os.getenv("PORT", 8000))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", f"http://localhost:{PORT}")

# Database & Cache (Optional - local fallback provided)
MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("DB_NAME", "ai_interview_db")
REDIS_HOST = os.getenv("REDIS_HOST", None)
REDIS_PORT = os.getenv("REDIS_PORT", None)

# AI Configuration - First Priority: Google Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEY = GOOGLE_API_KEY
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Default order: First Gemini, then fallback to Groq
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini")
AI_MODEL = os.getenv("AI_MODEL", "gemini-3.8-flash")
AI_FALLBACK_PROVIDER = os.getenv("AI_FALLBACK_PROVIDER", "groq")
AI_FALLBACK_MODEL = os.getenv("AI_FALLBACK_MODEL", "openai/gpt-oss-120b")
AI_REQUEST_TIMEOUT_SECONDS = float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", 45))
AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", 2))

INTERVIEW_SESSION_TTL_SECONDS = int(os.getenv("INTERVIEW_SESSION_TTL_SECONDS", 60 * 60 * 6))
