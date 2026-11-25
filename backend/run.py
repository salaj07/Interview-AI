"""
Convenient entrypoint to run the backend server.
Usage:
    python run.py
"""
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting AI Mock Interviewer Backend on http://localhost:{port} ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

