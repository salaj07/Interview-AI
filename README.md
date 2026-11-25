# AI Mock Interview Studio (Gen AI Project)

An end-to-end, adaptive AI Voice Mock Interview platform extracted into an independent, standalone project from InterLeet.

## 🚀 Key Highlights

- **Direct Dashboard Access (Zero Login Wall):** Land straight onto the interactive interview dashboard to browse curated role tracks, take technical or system design interviews, and review performance reports without requiring login credentials or token setups.
- **Adaptive Graph Architecture:** Questions are dynamically selected and adapted based on the candidate's answers, depth of reasoning, and technical trade-offs using a multi-node decision graph.
- **Natural Voice STT / TTS:** Conversational voice mock interviews with real-time browser Speech-to-Text (`SpeechRecognition`) and smooth Text-to-Speech synthesis (OpenAI TTS stream with automatic browser Web Speech API fallback).
- **Comprehensive Rubric Reports:** Turn-by-turn answer evaluation, 6-pillar dimensional radar breakdown (Technical Depth, Problem Solving, Communication, Systems Reasoning, Trade-off Analysis, Role Fit), strengths, and growth recommendations.
- **Zero-Friction Standalone Persistence:** Seamless in-memory session caching and automatic local JSON storage (`data/reports.json`), with optional MongoDB and Redis connectivity if configured in `.env`.

---

## 📁 Project Structure

```
gen ai project/
├── README.md
├── .gitignore
├── backend/
│   ├── .env                    # Environment variables (LLM keys, port)
│   ├── .env.example
│   ├── requirements.txt        # Python package dependencies
│   ├── run.py                  # Direct Uvicorn startup script
│   └── app/
│       ├── main.py             # FastAPI entrypoint & CORS middleware
│       ├── core/
│       │   ├── config.py       # Configuration loader
│       │   └── db.py           # MongoDB + Resilient Local JSON storage
│       ├── data/
│       │   ├── presets.json    # Curated role tracks & job descriptions
│       │   └── reports.json    # Local reports persistence store
│       ├── routers/
│       │   └── interview.py    # Public interview endpoints
│       └── ai/
│           ├── graph/          # Decision tree state graph & node handlers
│           ├── prompts/        # System, question & rubric evaluation prompts
│           ├── providers/      # Groq, OpenAI, Gemini, Claude LLM integrations
│           ├── resume/         # Resume parser & skill extractor
│           ├── schemas/        # Pydantic state models & schemas
│           └── services/       # AI client, session management & report builder
│
└── frontend/
    ├── .env                    # Frontend backend URL config
    ├── .env.example
    ├── package.json
    ├── vite.config.js          # Vite config with Tailwind CSS v4
    ├── index.html
    └── src/
        ├── App.jsx             # React Router setup
        ├── main.jsx
        ├── index.css           # Global theme styles
        ├── api/
        │   └── client.js       # Centralized API fetcher
        ├── components/
        │   ├── Navbar.jsx      # Navigation bar
        │   ├── Waveform.jsx    # Audio waveform visualizer
        │   └── ...
        └── pages/
            ├── Dashboard.jsx   # Home page (role tracks & report history)
            ├── Setup.jsx       # Track config, mic test & resume upload
            ├── LiveInterview.jsx # Real-time voice interview room
            └── Report.jsx      # Scorecard & dimensional radar critique
```

---

## 🛠️ Getting Started

### 1. Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. (Optional) Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your `.env`:
   Open `backend/.env` and add your preferred LLM API key (e.g., Groq, OpenAI, or Gemini):
   ```env
   AI_PROVIDER=groq
   AI_MODEL=llama-3.3-70b-versatile
   GROQ_API_KEY=your_groq_api_key_here

   # Optional for voice TTS:
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. Start the backend:
   ```bash
   python run.py
   ```
   Backend will be running at `http://localhost:8000`. You can visit `http://localhost:8000/docs` for the interactive OpenAPI documentation.

---

### 2. Frontend Setup

1. Open another terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173`. Open your browser and start practicing!

---

## 🎯 How the Interview Flow Works

1. **Dashboard (`/`):** Select a curated track (Senior Backend, Frontend Architect, System Design L5, DevOps Lead, Full-Stack, etc.) or click **Launch Mock Interview**.
2. **Setup (`/setup`):** Fine-tune target questions, customize probed technologies, perform a live microphone check, or upload a resume to tailor questions.
3. **Live Voice Room (`/interview/:id`):** Sara AI will greet you and ask technical questions. Speak into your microphone (or type via Text Mode) and hit **Submit Answer**.
4. **Comprehensive Evaluation (`/report/:id`):** Review your overall score, dimensional radar chart, demonstrated strengths, target growth areas, and turn-by-turn critiques.

