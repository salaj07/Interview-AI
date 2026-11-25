"""
Generates a crisp, publication-grade black-and-white / grayscale Architecture Diagram
for the AI-Powered Mock Interview System.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_IMG = BASE_DIR / "documents" / "ppt_assets" / "genai_architecture.png"
OUTPUT_IMG.parent.mkdir(parents=True, exist_ok=True)

def draw_diagram():
    fig, ax = plt.subplots(figsize=(11, 6.8), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7.2)
    ax.axis("off")

    # Background canvas
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # Title Banner (Black only)
    ax.text(5.5, 6.85, "SYSTEM ARCHITECTURE: AI-POWERED MOCK INTERVIEW",
            fontsize=13, fontweight="bold", ha="center", va="center", color="black",
            family="sans-serif")
    ax.plot([1.0, 10.0], [6.65, 6.65], color="black", linewidth=1.5)

    # Function to draw styled boxes
    def draw_box(x, y, w, h, title, items=[], bg="#FAFAFA", border="black", lw=1.2, is_group=False):
        rect = patches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.06,rounding_size=0.1",
            edgecolor=border, facecolor=bg, linewidth=lw, linestyle="-"
        )
        ax.add_patch(rect)
        if is_group:
            ax.text(x + 0.15, y + h - 0.22, title, fontsize=9.5, fontweight="bold",
                    ha="left", va="center", color="black", family="sans-serif")
            ax.plot([x + 0.1, x + w - 0.1], [y + h - 0.35, y + h - 0.35],
                    color="#444444", linewidth=0.8)
        else:
            ax.text(x + w / 2, y + h - 0.22, title, fontsize=9, fontweight="bold",
                    ha="center", va="center", color="black", family="sans-serif")
            if items:
                ax.plot([x + 0.15, x + w - 0.15], [y + h - 0.35, y + h - 0.35],
                        color="#888888", linewidth=0.6)
        
        # Render item bullets
        y_offset = y + h - 0.52
        for item in items:
            ax.text(x + 0.15, y_offset, f"• {item}", fontsize=7.8,
                    ha="left", va="center", color="black", family="sans-serif")
            y_offset -= 0.24

    # 1. CLIENT LAYER (Left)
    draw_box(0.5, 0.6, 2.7, 5.8, "1. CLIENT LAYER (FRONTEND)", is_group=True, bg="#F8F9FA", lw=1.4)
    draw_box(0.65, 4.4, 2.4, 1.4, "Candidate Web App", [
        "React 18 + Vite + Tailwind",
        "Setup & Preset Track Config",
        "Resume Dropzone & Status"
    ], bg="white")
    draw_box(0.65, 2.5, 2.4, 1.7, "Real-Time Audio Studio", [
        "Web Audio API Analyser",
        "RMS Volume Calculation",
        "Dynamic 5s Silence Trigger",
        "MediaRecorder Audio Chunks"
    ], bg="white")
    draw_box(0.65, 0.8, 2.4, 1.5, "Live AI Avatar & Telemetry", [
        "Voice-Synchronized Waveform",
        "Real-Time Transcript Feed",
        "Session State & Rubrics"
    ], bg="white")

    # 2. BACKEND API LAYER (Center-Left)
    draw_box(3.5, 0.6, 2.2, 5.8, "2. BACKEND API (FASTAPI)", is_group=True, bg="#F8F9FA", lw=1.4)
    draw_box(3.65, 4.4, 1.9, 1.4, "Session Controller", [
        "In-Memory State Cache",
        "Session Lifecycle Manager",
        "/interview/start & /end"
    ], bg="white")
    draw_box(3.65, 2.7, 1.9, 1.5, "Audio Gateway", [
        "/interview/stt Handler",
        "/interview/tts Streaming",
        "WAV Format Transcoding"
    ], bg="white")
    draw_box(3.65, 0.8, 1.9, 1.7, "Document Ingestion", [
        "/interview/parse-resume",
        "PyMuPDF Binary Extraction",
        "Semantic Schema Parser",
        "Candidate Skill Profiler"
    ], bg="white")

    # 3. AGENTIC ORCHESTRATION (Center-Right)
    draw_box(6.0, 0.6, 2.2, 5.8, "3. AGENTIC GRAPH (LANGGRAPH)", is_group=True, bg="#F8F9FA", lw=1.4)
    draw_box(6.15, 4.8, 1.9, 1.0, "Context Node", [
        "State Vector Init",
        "JD & Resume Integration"
    ], bg="white")
    draw_box(6.15, 3.4, 1.9, 1.2, "Adaptive Question Node", [
        "Contextual Follow-ups",
        "Hallucination Guardrails"
    ], bg="white")
    draw_box(6.15, 2.0, 1.9, 1.2, "Evaluation Node", [
        "4-Pillar Rubric Grading",
        "Candidate Scoring Vector"
    ], bg="white")
    draw_box(6.15, 0.8, 1.9, 1.0, "Scorecard Node", [
        "Final Report Generation",
        "Actionable Feedback"
    ], bg="white")

    # 4. MULTI-MODEL GENAI & SPEECH SERVICES (Right)
    draw_box(8.5, 0.6, 2.1, 5.8, "4. GENAI & SPEECH SERVICES", is_group=True, bg="#F8F9FA", lw=1.4)
    draw_box(8.65, 4.2, 1.8, 1.6, "Resilient LLM Routing", [
        "Primary: Gemini 3.8 Flash",
        "Fallback: Groq GPT-OSS",
        "Exponential Backoff",
        "503 Failover Circuit"
    ], bg="white")
    draw_box(8.65, 2.3, 1.8, 1.7, "Speech Services", [
        "Sarvam AI Saaras v4 (STT)",
        "Groq Whisper (Fallback)",
        "Sarvam Bulbul v4 (TTS)",
        "Simran Conversational Voice"
    ], bg="white")
    draw_box(8.65, 0.8, 1.8, 1.3, "Document AI", [
        "Gemini Flash Structuring",
        "Dynamic Syllabus Engine",
        "Pydantic Validation"
    ], bg="white")

    # Arrows connecting layers
    def draw_arrow(x1, y1, x2, y2, label=""):
        ax.annotate(
            "", xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle="->", color="black", lw=1.3, shrinkA=3, shrinkB=3)
        )
        if label:
            ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 0.1, label, fontsize=6.8,
                    ha="center", va="center", color="black", backgroundcolor="white",
                    family="sans-serif", fontweight="bold")

    # Connect Layer 1 -> Layer 2
    draw_arrow(3.2, 5.1, 3.5, 5.1, "HTTP / JSON")
    draw_arrow(3.2, 3.4, 3.5, 3.4, "Audio Blob")
    draw_arrow(3.2, 1.6, 3.5, 1.6, "PDF Upload")

    # Connect Layer 2 -> Layer 3
    draw_arrow(5.7, 5.1, 6.0, 5.1, "Init State")
    draw_arrow(5.7, 3.4, 6.0, 3.4, "Evaluate")
    draw_arrow(5.7, 1.6, 6.0, 1.6, "Skills")

    # Connect Layer 3 -> Layer 4
    draw_arrow(8.2, 5.1, 8.5, 5.1, "Inference")
    draw_arrow(8.2, 3.1, 8.5, 3.1, "Speech I/O")
    draw_arrow(8.2, 1.4, 8.5, 1.4, "Structured AI")

    # State machine internal loop arrows in LangGraph
    ax.annotate("", xy=(7.1, 4.6), xytext=(7.1, 4.8),
                arrowprops=dict(arrowstyle="->", color="black", lw=1.1))
    ax.annotate("", xy=(7.1, 3.2), xytext=(7.1, 3.4),
                arrowprops=dict(arrowstyle="->", color="black", lw=1.1))
    ax.annotate("", xy=(7.1, 1.8), xytext=(7.1, 2.0),
                arrowprops=dict(arrowstyle="->", color="black", lw=1.1))

    plt.tight_layout()
    plt.savefig(str(OUTPUT_IMG), dpi=300, facecolor="white", edgecolor="none")
    plt.close()
    print(f"Architecture diagram saved to:\n  {OUTPUT_IMG}")

if __name__ == "__main__":
    draw_diagram()

