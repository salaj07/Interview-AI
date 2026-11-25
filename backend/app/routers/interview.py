"""
interview.py  ─  Interview API router
──────────────────────────────────────
Standalone public interview router with no login wall.
Default guest identity is assigned automatically if not specified.

Route order:
  POST  /start
  POST  /answer
  POST  /end
  GET   /reports/recent    ← static route before wildcard /{session_id}
  GET   /presets           ← static route before wildcard /{session_id}
  GET   /tts               ← static route before wildcard /{session_id}
  POST  /parse-resume      ← static route before wildcard /{session_id}
  GET   /{session_id}
  GET   /{session_id}/report
  WS    /ws/{session_id}
"""
from __future__ import annotations

import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse

from app.ai.graph.interview_graph import build_initial_state, run_interview_graph
from app.ai.resume.resume_parser import ResumeParser
from app.ai.services.report_repository import InterviewReportRepository
from app.ai.services.report_service import InterviewReportService
from app.ai.services.session_service import SessionService
from app.core.config import OPENAI_API_KEY, SARVAM_API_KEY, GROQ_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview"])

PRESETS_PATH = Path(__file__).resolve().parent.parent / "data" / "presets.json"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _interviewer_message(state: dict) -> str:
    preamble = (state.get("current_preamble") or "").strip()
    question = (state.get("current_question") or "").strip()
    return f"{preamble}\n\n{question}" if preamble else question


def _load_builtin_presets() -> list[dict[str, Any]]:
    try:
        if PRESETS_PATH.exists():
            with open(PRESETS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load presets from file: {e}")
    return [
        {
            "id": "backend",
            "title": "Senior Backend Engineer",
            "category": "Backend",
            "description": "Concurrency, microservices, databases, caching, and scalable system design.",
            "duration_minutes": 45,
            "topics": ["API design", "data modeling", "caching", "reliability", "communication"],
        },
        {
            "id": "frontend",
            "title": "Frontend Architect",
            "category": "Frontend",
            "description": "Performance, state management, design systems, Web Vitals, and accessibility.",
            "duration_minutes": 45,
            "topics": ["frontend architecture", "state management", "performance", "accessibility", "collaboration"],
        },
        {
            "id": "sysdesign",
            "title": "System Design (L5)",
            "category": "System Design",
            "description": "End-to-end architecture for production distributed systems under high scale.",
            "duration_minutes": 60,
            "topics": ["requirements", "data model", "scaling", "tradeoffs", "risk handling"],
        },
        {
            "id": "fullstack",
            "title": "Full-Stack Generalist",
            "category": "Fullstack",
            "description": "Mixed technical scenarios across both frontend UI and backend services.",
            "duration_minutes": 50,
            "topics": ["React architecture", "state management", "API design & middleware", "database optimization", "security"],
        },
    ]


# ─── POST /start ─────────────────────────────────────────────────────────────

@router.post("/start")
async def start_interview(payload: dict):
    """Start a new AI interview session. No authentication required."""
    user_id = payload.get("user_id") or "guest_candidate"
    state = build_initial_state(payload, user_id=user_id)
    try:
        state = await run_interview_graph(state)
    except Exception as exc:
        logger.error(f"[Interview Start Error]: {exc}")
        err_msg = str(exc)
        if "429" in err_msg or "rate limit" in err_msg.lower() or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="AI service is experiencing high traffic or temporary rate limits. Please try again in a few moments."
            )
        raise HTTPException(status_code=500, detail=f"Interview AI processing error: {err_msg}")

    await SessionService.create_session(state["session_id"], state)
    return {
        "session_id":            state["session_id"],
        "message":               _interviewer_message(state),
        "question":              state.get("current_question", ""),
        "preamble":              state.get("current_preamble", ""),
        "affect":                state.get("current_affect", ""),
        "answer_guidance":       state.get("current_answer_guidance", ""),
        "topic":                 state.get("current_topic", ""),
        "difficulty":            state.get("difficulty", "easy"),
        "interview_phase":       state.get("interview_phase", "intro"),
        "completed":             state.get("completed", False),
        "covered_topics":        state.get("covered_topics", []),
        "remaining_topics":      state.get("remaining_topics", []),
        "tree_nodes":            state.get("tree_nodes", []),
        "active_node_id":        state.get("active_node_id", ""),
        "current_tree_depth":    state.get("current_tree_depth", 0),
        "threshold_score":       state.get("threshold_score", 7.0),
        "questions_asked_count": len(state.get("questions_asked", [])),
        "max_questions":         state.get("max_questions", 20),
        "min_questions":         state.get("min_questions", 2),
    }


# ─── POST /answer ─────────────────────────────────────────────────────────────

@router.post("/answer")
async def answer_question(payload: dict):
    """Submit a candidate answer and receive the next question or completion report."""
    session_id = payload.get("session_id")
    answer = payload.get("answer", "").strip()
    if not session_id or not answer:
        raise HTTPException(status_code=400, detail="session_id and answer are required")

    state = await SessionService.get_session(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Interview session not found or expired")

    state["last_answer"] = answer
    state["last_answer_topic"] = payload.get("topic", state.get("current_topic", ""))

    try:
        state = await run_interview_graph(state)
    except Exception as exc:
        logger.error(f"[Interview Answer Error]: {exc}")
        err_msg = str(exc)
        if "429" in err_msg or "rate limit" in err_msg.lower() or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="AI service is experiencing high traffic or temporary rate limits. Please try again in a few moments."
            )
        raise HTTPException(status_code=500, detail=f"Interview AI processing error: {err_msg}")

    report = None
    if state.get("completed"):
        report = InterviewReportService.build_report(state)
        report["status"] = "completed"
        await InterviewReportRepository.save_report(
            session_id=session_id,
            report=report,
            state=state,
        )
        await SessionService.delete_session(session_id)
    else:
        await SessionService.update_session(session_id, state)

    response = {
        "session_id":            session_id,
        "completed":             state.get("completed", False),
        "completion_reason":     state.get("completion_reason", ""),
        "closing_message":       state.get("closing_message", ""),
        "message":               state.get("closing_message", "") if state.get("completed") else _interviewer_message(state),
        "question":              "" if state.get("completed") else state.get("current_question", ""),
        "preamble":              "" if state.get("completed") else state.get("current_preamble", ""),
        "affect":                "" if state.get("completed") else state.get("current_affect", ""),
        "answer_guidance":       "" if state.get("completed") else state.get("current_answer_guidance", ""),
        "topic":                 "" if state.get("completed") else state.get("current_topic", ""),
        "difficulty":            state.get("difficulty", "easy"),
        "interview_phase":       state.get("interview_phase", "adaptive_questions"),
        "evaluation":            state.get("last_evaluation"),
        "covered_topics":        state.get("covered_topics", []),
        "remaining_topics":      state.get("remaining_topics", []),
        "tree_nodes":            state.get("tree_nodes", []),
        "active_node_id":        state.get("active_node_id", ""),
        "current_tree_depth":    state.get("current_tree_depth", 0),
        "threshold_score":       state.get("threshold_score", 7.0),
        "questions_asked_count": len(state.get("questions_asked", [])),
        "max_questions":         state.get("max_questions", 20),
        "min_questions":         state.get("min_questions", 2),
    }
    if report is not None:
        response["report"] = report
    return response


# ─── POST /end ────────────────────────────────────────────────────────────────

@router.post("/end")
async def end_interview_early(payload: dict):
    """End an interview early mid-session and generate a partial report."""
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    state = await SessionService.get_session(session_id)
    if state is None:
        # Check if already completed and stored
        saved = await InterviewReportRepository.get_report(session_id)
        if saved:
            return {"session_id": session_id, "report": saved.get("report", {})}
        raise HTTPException(status_code=404, detail="Interview session not found")

    report = InterviewReportService.build_report(state)
    report["status"] = "ended_early"
    await InterviewReportRepository.save_report(
        session_id=session_id,
        report=report,
        state=state,
    )
    await SessionService.delete_session(session_id)
    return {"session_id": session_id, "report": report}


# ─── GET /reports/recent ──────────────────────────────────────────────────────

@router.get("/reports/recent")
async def list_interview_reports(user_id: str | None = None, limit: int = 20):
    """List recent completed interview reports for the dashboard."""
    reports = await InterviewReportRepository.list_reports(user_id=user_id, limit=limit)
    formatted = []
    for r in reports:
        created_at = r.get("created_at")
        when_str = "Recent"
        if isinstance(created_at, datetime):
            diff = datetime.utcnow() - created_at
            when_str = (
                "Today" if diff.days == 0
                else "1d ago" if diff.days == 1
                else f"{diff.days}d ago"
            )
        elif isinstance(created_at, str):
            when_str = created_at.split("T")[0] if "T" in created_at else created_at[:10]

        rep_data = r.get("report", {})
        score = rep_data.get("overall_score") or rep_data.get("average_score") or 0
        formatted.append({
            "id":       r.get("session_id"),
            "role":     r.get("role") or "Software Engineer",
            "score":    score,
            "when":     when_str,
            "duration": 45,
            "status":   rep_data.get("status", "completed"),
        })
    return formatted


# ─── GET /presets ─────────────────────────────────────────────────────────────

@router.get("/presets")
async def get_interview_presets():
    """Return available role presets with skills, JDs, and focus areas."""
    presets = _load_builtin_presets()
    return {"presets": presets}


# ─── POST /parse-resume ───────────────────────────────────────────────────────

@router.post("/parse-resume")
async def parse_resume_upload(
    file: UploadFile | None = File(None),
    raw_text: str | None = None
):
    """Extract skills, technologies, and experience from a resume file or pasted text."""
    text_content = ""
    if file:
        try:
            content = await file.read()
            if file.filename.lower().endswith(".pdf"):
                try:
                    import fitz
                    doc = fitz.open(stream=content, filetype="pdf")
                    for page in doc:
                        text_content += page.get_text() + "\n"
                except Exception as e:
                    logger.warning(f"PyMuPDF error: {e}, falling back to plain decode")
                    text_content = content.decode("utf-8", errors="ignore")
            else:
                text_content = content.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    elif raw_text:
        text_content = raw_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or raw_text")

    if not text_content:
        raise HTTPException(status_code=400, detail="Could not extract text from input")

    try:
        parsed = await ResumeParser.parse_text(text_content)
        return parsed
    except Exception as exc:
        logger.error(f"Resume parsing error: {exc}")
        # Return fallback heuristic structure so user is never blocked
        return {
            "parsed_resume": {
                "summary": "Software engineering candidate with background in software development.",
                "skills": ["Problem Solving", "Communication", "System Design"],
                "technologies": ["Python", "JavaScript", "SQL", "Git"],
                "experience": [],
                "projects": []
            },
            "mock_test": {
                "role": "Software Engineer",
                "interview_type": "technical",
                "difficulty": "medium",
                "topics": ["Core Fundamentals", "Architecture", "Data Structures"]
            }
        }


# ─── POST /stt (Sarvam AI Speech-to-Text with Groq Whisper Fallback) ─────────

@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe candidate voice audio using Sarvam AI Saaras model (or Groq Whisper fallback)."""
    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {e}")

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload received")

    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    # 1. Primary: Sarvam AI Saaras model
    sarvam_key = (SARVAM_API_KEY or "").strip()
    if sarvam_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=35.0) as client:
                files = {
                    "file": (filename, audio_bytes, content_type)
                }
                data = {
                    "model": "saaras:v4",
                    "mode": "transcribe",
                }
                headers = {"api-subscription-key": sarvam_key}
                resp = await client.post(
                    "https://api.sarvam.ai/speech-to-text",
                    headers=headers,
                    files=files,
                    data=data,
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    transcript = (payload.get("transcript") or "").strip()
                    if transcript:
                        return {
                            "transcript": transcript,
                            "provider": "sarvam_ai",
                            "model": "saaras:v4",
                            "language_code": payload.get("language_code", "en-IN"),
                        }
                else:
                    logger.warning("Sarvam AI STT returned status %s: %s", resp.status_code, resp.text)
        except Exception as e:
            logger.warning("Sarvam AI STT request exception: %s, falling back to Groq Whisper", e)

    # 2. Resilient Fallback: Groq Whisper Large v3
    groq_key = (GROQ_API_KEY or "").strip()
    if groq_key:
        try:
            from groq import Groq
            groq_client = Groq(api_key=groq_key)
            transcription = groq_client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3",
                response_format="json",
                temperature=0.0,
            )
            text = (transcription.text or "").strip()
            if text:
                return {
                    "transcript": text,
                    "provider": "groq_whisper",
                    "model": "whisper-large-v3",
                }
        except Exception as e:
            logger.error("Groq Whisper transcription failed: %s", e)

    if not sarvam_key and not groq_key:
        raise HTTPException(
            status_code=500,
            detail="Neither SARVAM_API_KEY nor GROQ_API_KEY is configured for speech-to-text.",
        )

    raise HTTPException(status_code=500, detail="Voice transcription failed across configured speech providers.")


# ─── GET /tts (Sarvam AI Bulbul TTS Exclusively) ─────────────────────────────

@router.get("/tts")
async def text_to_speech(text: str, voice: str = "simran_en_customer"):
    """
    Generate and stream natural AI voice speech exclusively using Sarvam AI Bulbul model.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text parameter is required")

    sarvam_key = (SARVAM_API_KEY or "").strip()
    if not sarvam_key:
        raise HTTPException(
            status_code=500,
            detail="SARVAM_API_KEY is not configured in .env for Sarvam AI TTS.",
        )

    try:
        import httpx
        import base64
        speaker = voice if voice and voice not in ("nova", "shimmer", "alloy") else "simran_en_customer"
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "Content-Type": "application/json",
                    "api-subscription-key": sarvam_key,
                },
                json={
                    "inputs": [text.strip()[:2000]],
                    "target_language_code": "en-IN",
                    "model": "bulbul:v4-flash",
                    "speaker": speaker,
                    "speech_sample_rate": 24000,
                    "enable_preprocessing": True,
                },
            )
            if resp.status_code == 200:
                payload = resp.json()
                audios = payload.get("audios", [])
                if audios:
                    audio_bytes = base64.b64decode(audios[0])
                    return Response(
                        content=audio_bytes,
                        media_type="audio/wav",
                        headers={
                            "Cache-Control": "public, max-age=86400",
                            "Content-Disposition": "inline",
                        },
                    )
            logger.warning("Sarvam AI TTS API error (%s): %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail=f"Sarvam AI TTS error: {resp.text}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Sarvam AI TTS exception: %s", exc)
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {exc}")


# ─── GET /{session_id} ────────────────────────────────────────────────────────

@router.get("/{session_id}")
async def get_interview_session(session_id: str):
    """Retrieve the current in-flight state of an interview session."""
    state = await SessionService.get_session(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Interview session not found or already completed")
    return state


# ─── GET /{session_id}/report ─────────────────────────────────────────────────

@router.get("/{session_id}/report")
async def get_interview_report(session_id: str):
    """Retrieve or finalize the evaluation report for a session."""
    state = await SessionService.get_session(session_id)
    if state is not None:
        report = InterviewReportService.build_report(state)
        report["status"] = "completed"
        await InterviewReportRepository.save_report(
            session_id=session_id,
            report=report,
            state=state,
        )
        await SessionService.delete_session(session_id)
        return report

    saved_report = await InterviewReportRepository.get_report(session_id)
    if saved_report is None:
        raise HTTPException(status_code=404, detail="Interview report not found")
    return saved_report.get("report", saved_report)


# ─── WS /ws/{session_id} ──────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """Live bi-directional WebSocket interface for real-time interview turns."""
    await websocket.accept()
    state = await SessionService.get_session(session_id)
    if state is None:
        await websocket.send_json({"type": "error", "message": "Interview session not found"})
        await websocket.close(code=1008)
        return

    await websocket.send_json({
        "type":            "question",
        "question":        state.get("current_question", ""),
        "message":         _interviewer_message(state),
        "preamble":        state.get("current_preamble", ""),
        "affect":          state.get("current_affect", ""),
        "answer_guidance": state.get("current_answer_guidance", ""),
        "topic":           state.get("current_topic", ""),
        "difficulty":      state.get("difficulty", "medium"),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            if payload.get("type") != "answer":
                await websocket.send_json({"type": "error", "message": "Unsupported message type"})
                continue

            state["last_answer"] = payload.get("answer", "")
            state["last_answer_topic"] = payload.get("topic", state.get("current_topic", ""))
            state = await run_interview_graph(state)
            await SessionService.update_session(session_id, state)

            if state.get("completed"):
                report = InterviewReportService.build_report(state)
                report["status"] = "completed"
                await InterviewReportRepository.save_report(
                    session_id=session_id, report=report, state=state,
                )
                await SessionService.delete_session(session_id)
                await websocket.send_json({
                    "type":              "completed",
                    "completion_reason": state.get("completion_reason", ""),
                    "message":           state.get("closing_message", ""),
                    "closing_message":   state.get("closing_message", ""),
                    "report":            report,
                })
                await websocket.close()
                return

            await websocket.send_json({
                "type":            "question",
                "question":        state.get("current_question", ""),
                "message":         _interviewer_message(state),
                "preamble":        state.get("current_preamble", ""),
                "affect":          state.get("current_affect", ""),
                "answer_guidance": state.get("current_answer_guidance", ""),
                "topic":           state.get("current_topic", ""),
                "difficulty":      state.get("difficulty", "medium"),
                "evaluation":      state.get("last_evaluation"),
            })
    except WebSocketDisconnect:
        await SessionService.update_session(session_id, state)

