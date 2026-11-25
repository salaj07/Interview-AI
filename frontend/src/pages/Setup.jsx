import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Volume2, Upload, FileText, CheckCircle,
  AlertTriangle, ArrowLeft, ArrowRight, Play, Sparkles, Check,
  Clock, DollarSign, Briefcase, RefreshCw, X, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { fetchPresets, parseResume, startInterviewSession } from "@/api/client";

const ROLE_JDS = {
  "Senior Backend Engineer": {
    title: "Senior Backend Engineer",
    overview: "Build resilient, distributed systems to support high-throughput services. Optimize backend flows, design scalable relational and NoSQL storage layers, and lead microservice migrations.",
    responsibilities: [
      "Design, implement, and maintain microservice APIs using FastAPI/Python or Go.",
      "Build robust caching layers and message queuing pipelines for event-driven logic.",
      "Refactor bottlenecked database queries and implement read-replicas/sharding.",
      "Set up health-check systems and end-to-end trace logging."
    ],
    requirements: [
      "Strong proficiency in Python (FastAPI/Django), Go, or Java.",
      "Extensive experience with SQL (PostgreSQL/MySQL) and NoSQL (MongoDB, Redis).",
      "Experience building event pipelines using Kafka, RabbitMQ, or AWS SQS.",
      "Mastery of asynchronous programming and concurrency control."
    ],
    focus_areas: [
      "System scale and database performance",
      "Concurrency and thread safety in Python/Go",
      "Caching policies and data eviction strategies"
    ],
    technologies: ["Python", "FastAPI", "PostgreSQL", "MongoDB", "Redis", "Docker", "RabbitMQ"],
    level: "L5 / Senior Engineer",
    salary: "$140,000 - $180,000"
  },
  "Frontend Architect": {
    title: "Frontend Architect",
    overview: "Lead the design, scaffolding, and performance tuning of modern frontend web applications. Build reusable component libraries, architect global state strategies, and ensure optimal web vitals.",
    responsibilities: [
      "Architect micro-frontend and multi-page monorepo systems.",
      "Optimize core web vitals, bundle size, caching, and asset pipelines.",
      "Standardize design systems and style tokens for accessibility (WCAG 2.1 AA).",
      "Standardize client-side telemetry, error logging, and user session monitoring."
    ],
    requirements: [
      "Master of React, TypeScript, and ecosystem tooling (Webpack, Vite, Turborepo).",
      "Expertise in state managers (Redux Toolkit, Zustand, Recoil).",
      "Deep understanding of CSS layout models, preprocessors, and utility styling.",
      "Knowledge of server-side rendering (SSR), hydration, and edge-rendering architectures."
    ],
    focus_areas: [
      "Component modularity and state lifecycle",
      "Core Web Vitals and performance budgets",
      "Responsive styles and cross-browser consistency"
    ],
    technologies: ["React", "TypeScript", "Next.js", "Redux", "Tailwind CSS", "Vite", "Jest"],
    level: "L6 / Staff Architect",
    salary: "$160,000 - $210,000"
  },
  "System Design (L5)": {
    title: "System Design (L5)",
    overview: "Architect high-level distributed systems under extreme scale constraints. Establish data routing, high availability systems, failover mechanisms, and multi-region deployment blueprints.",
    responsibilities: [
      "Propose scalable architectural diagrams resolving latency bottlenecks.",
      "Evaluate consistency trade-offs (CAP theorem) in distributed datastores.",
      "Implement rate limiters, API gateways, load balancers, and CDN networks.",
      "Architect failover topologies, write-ahead-logging, and split-brain resolution."
    ],
    requirements: [
      "Proven experience designing platforms handling >10k requests per second.",
      "Mastery of load balancing algorithms, HTTP/2, gRPC, and WebSockets.",
      "Practical knowledge of sharding, hashing rings, and partition keys.",
      "Experience with distributed transaction patterns (Sagas, 2PC)."
    ],
    focus_areas: [
      "System scalability, redundancy, and CAP tradeoffs",
      "Data routing, hashing, and load balancing",
      "Resilience policies (circuit breakers, retries)"
    ],
    technologies: ["NGINX", "HAProxy", "gRPC", "Cassandra", "DynamoDB", "Redis", "AWS"],
    level: "L5 / Senior Architect",
    salary: "$150,000 - $190,000"
  },
  "DevOps Lead": {
    title: "DevOps Lead",
    overview: "Own the infrastructure, continuous integration pipelines, container configurations, and active monitoring frameworks of cloud-based platforms. Keep system availability >99.99%.",
    responsibilities: [
      "Construct high-velocity CI/CD workflows and automated test runner integrations.",
      "Manage and scale Kubernetes clusters, ingress controllers, and service meshes.",
      "Automate infrastructure provisioning with declarative IaC state definitions.",
      "Configure telemetry dashboards, alert rules, and log collection daemons."
    ],
    requirements: [
      "Deep familiarity with AWS, GCP, or Azure services.",
      "Mastery of Terraform, Helm, and Kubernetes administration.",
      "Experience with monitoring software (Prometheus, Grafana, ELK, Datadog).",
      "Solid knowledge of containerization (Docker) and networking topologies (VPCs, DNS, VPNs)."
    ],
    focus_areas: [
      "Infrastructure orchestration and Terraform states",
      "Kubernetes resource quotas and ingress networks",
      "Zero-downtime rolling updates"
    ],
    technologies: ["Kubernetes", "Docker", "Terraform", "GitLab CI", "Prometheus", "Grafana", "AWS"],
    level: "L5 / Lead DevOps",
    salary: "$135,000 - $175,000"
  },
  "API Design": {
    title: "API Design",
    overview: "Design and enforce standard contracts, request/response models, authorization rules, and lifecycle versioning rules for developer-facing APIs.",
    responsibilities: [
      "Define clean RESTful and GraphQL endpoints using OpenAPI/Swagger schemas.",
      "Enforce security paradigms including OAuth2, JWT verification, and scope validation.",
      "Formulate version deprecation policies and backward-compatible schemas.",
      "Design robust batch execution endpoints and webhooks."
    ],
    requirements: [
      "Expertise in REST, GraphQL, gRPC design paradigms.",
      "Experience writing clean OpenAPI specifications.",
      "Mastery of token-based authentication and rate limiting configurations.",
      "Experience building SDK libraries and developer portals."
    ],
    focus_areas: [
      "OpenAPI definition standards and schemas",
      "Authentication protocols and API security profiles",
      "API caching policies and payload sizing"
    ],
    technologies: ["OpenAPI", "GraphQL", "OAuth2", "JWT", "Kong Gateway", "Swagger"],
    level: "L4 / Senior API Specialist",
    salary: "$125,000 - $165,000"
  },
  "Full-Stack Generalist": {
    title: "Full-Stack Generalist",
    overview: "Build features end-to-end by stitching modern user interfaces with robust database services. Deliver feature requests quickly with an emphasis on customer-centric design and fast execution.",
    responsibilities: [
      "Develop interactive UI views and integrate them with REST/GraphQL endpoints.",
      "Write clean server-side controllers, models, and data migrations.",
      "Troubleshoot bugs across frontend browsers, databases, and microservices.",
      "Maintain and extend unit test coverage for all code paths."
    ],
    requirements: [
      "Professional experience using both frontend frameworks (React/Vue) and backend runtimes (Node, Python).",
      "Comfortable working with SQL database integrations and object-relational mapping (ORMs).",
      "Fast learner capable of pivoting across multiple language codebases.",
      "Understanding of Git workflows, code reviews, and basic server configurations."
    ],
    focus_areas: [
      "Full-stack integration patterns",
      "Database query execution and ORM optimizations",
      "Clean code and automated test coverage"
    ],
    technologies: ["React", "Node.js", "Express", "PostgreSQL", "Prisma", "Git", "Docker"],
    level: "L4 / Senior Developer",
    salary: "$120,000 - $160,000"
  },
  "MERN Stack Developer": {
    title: "MERN Stack Developer",
    overview: "Develop and maintain robust web applications using MongoDB, Express.js, React, and Node.js. Focus on component optimization, state lifecycles, and database aggregation query logic.",
    responsibilities: [
      "Implement and secure RESTful APIs using Node.js, Express, and JWT.",
      "Model hierarchical, relational-style databases inside MongoDB using Mongoose schemas.",
      "Optimize React client-side rendering performance, state caches, and hook lifecycles.",
      "Ensure API safety through middleware verification and payload validation."
    ],
    requirements: [
      "Strong JavaScript/TypeScript proficiency.",
      "Proficiency with MongoDB document structures, indices, and pipeline aggregations.",
      "Solid comprehension of the Node.js event-loop and asynchronous control flow.",
      "Experience with client state libraries (Redux Toolkit, Context, or Zustand)."
    ],
    focus_areas: [
      "React render optimization and caching",
      "MongoDB database modeling and index optimizations",
      "Token-based authorization and session security middleware"
    ],
    technologies: ["MongoDB", "Express.js", "React", "Node.js", "Mongoose", "Redux", "JWT"],
    level: "L4 / Senior Developer",
    salary: "$115,000 - $145,000"
  }
};

const ROLE_INTERVIEW_TYPE = {
  "Senior Backend Engineer": "backend",
  "Frontend Architect": "frontend",
  "System Design (L5)": "system_design",
  "DevOps Lead": "devops",
  "API Design": "backend",
  "Full-Stack Generalist": "fullstack",
  "MERN Stack Developer": "mern",
};

const ROLE_TOPICS = {
  "Senior Backend Engineer": ["System Design", "Databases", "Concurrency", "Microservices", "Caching"],
  "Frontend Architect": ["React", "State Management", "Performance", "TypeScript", "Testing"],
  "System Design (L5)": ["Scalability", "CAP Theorem", "Load Balancing", "Data Modeling", "Resilience"],
  "DevOps Lead": ["CI/CD", "Docker", "Kubernetes", "Cloud Infrastructure", "Monitoring"],
  "API Design": ["REST", "GraphQL", "Auth", "Rate Limiting", "Versioning"],
  "Full-Stack Generalist": ["React", "Node.js", "SQL", "APIs", "Testing"],
  "MERN Stack Developer": ["React Hooks", "Node.js Express", "MongoDB Mongoose", "JWT Auth", "State Management"],
};

const DIFFICULTY_MAP = { Easy: "easy", Intermediate: "medium", Hard: "hard" };

export function Setup() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get("role") || "Senior Backend Engineer";
  const difficultyParam = searchParams.get("difficulty") || "Intermediate";

  const [selectedRole, setSelectedRole] = useState(roleParam);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyParam);

  // Audio / Mic states
  const [micPermission, setMicPermission] = useState("prompt"); // prompt, granted, denied
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSpeakerPlaying, setIsSpeakerPlaying] = useState(false);
  const [speakerVerified, setSpeakerVerified] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Resume states
  const [useResume, setUseResume] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedJD, setParsedJD] = useState(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);

  // Starting state
  const [isStarting, setIsStarting] = useState(false);

  // Find Job Description data
  const jdData = ROLE_JDS[selectedRole] || ROLE_JDS["Senior Backend Engineer"];

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setSearchParams({ role: newRole, difficulty: selectedDifficulty });
  };

  const handleDifficultyChange = (newDiff) => {
    setSelectedDifficulty(newDiff);
    setSearchParams({ role: selectedRole, difficulty: newDiff });
  };

  // Microphone Check
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
      toast.success("Microphone connected!");

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const avg = total / bufferLength;
        const mapped = Math.min(Math.round((avg / 80) * 100), 100);
        setVolumeLevel(mapped);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Mic access error:", err);
      setMicPermission("denied");
      toast.error("Could not access microphone. Please check browser permissions.");
    }
  };

  const stopMic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    setVolumeLevel(0);
  };

  useEffect(() => {
    return () => { stopMic(); };
  }, []);

  // Speaker Chime Test
  const playTestSound = () => {
    if (isSpeakerPlaying) return;
    setIsSpeakerPlaying(true);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);

      setTimeout(() => {
        setIsSpeakerPlaying(false);
        setSpeakerVerified(true);
        toast.success("Test chime played successfully!");
      }, 1200);
    } catch (e) {
      console.error(e);
      setIsSpeakerPlaying(false);
    }
  };

  // Resume Upload & Auto-Parsing
  const parseFile = async (file) => {
    if (!file) return null;
    setIsParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await parseResume(formData);
      const resumeData = data?.parsed_resume || {};
      const mockTest = data?.mock_test || {};

      const parsedInfo = {
        skills: resumeData.skills?.slice(0, 10) || [],
        technologies: resumeData.technologies?.slice(0, 8) || [],
        summary: resumeData.summary || "",
        topics: mockTest.topics || [],
      };
      setResumeUploaded(true);
      setParsedJD(parsedInfo);
      toast.success("Resume parsed successfully! Questions will now tailor to your background.");
      return parsedInfo;
    } catch (err) {
      console.error("Resume parse error:", err);
      toast.error("Resume parsing fallback applied. Ready to start.");
      const fallbackInfo = {
        skills: ["System Design", "Problem Solving", "Core Architecture"],
        technologies: jdData.technologies || [],
        summary: "Software engineering background extracted from resume.",
        topics: jdData.focus_areas || [],
      };
      setResumeUploaded(true);
      setParsedJD(fallbackInfo);
      return fallbackInfo;
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are supported currently.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      setSelectedFile(file);
      setUseResume(true);
      // Automatically trigger parsing immediately upon file selection
      parseFile(file);
    }
  };

  const handleUploadResume = () => {
    if (selectedFile) {
      parseFile(selectedFile);
    }
  };

  // Launch interview session
  const handleStartInterview = async () => {
    stopMic();
    setIsStarting(true);

    // If file is selected but parsing is in progress or hasn't finished, parse it first
    let currentParsed = parsedJD;
    if (selectedFile && (!resumeUploaded || !currentParsed)) {
      currentParsed = await parseFile(selectedFile);
    }

    const baseTopics = ROLE_TOPICS[selectedRole] || [];
    const isUsingResume = useResume && (resumeUploaded || currentParsed);
    const resumeTopics =
      isUsingResume && currentParsed?.topics?.length
        ? currentParsed.topics
        : baseTopics;

    let finalJD = jdData.overview;
    if (isUsingResume && currentParsed) {
      const topicsStr = currentParsed.topics?.length ? `Focus topics: ${currentParsed.topics.join(", ")}.` : "";
      const skillsStr = currentParsed.skills?.length ? `Key candidate skills: ${currentParsed.skills.join(", ")}.` : "";
      finalJD = `${jdData.overview} ${topicsStr} ${skillsStr}`.trim();
    }

    const payload = {
      role: selectedRole,
      interview_type: ROLE_INTERVIEW_TYPE[selectedRole] || "technical",
      difficulty: DIFFICULTY_MAP[selectedDifficulty] || "medium",
      jd: finalJD,
      topics: resumeTopics,
      max_questions: 8,
      min_questions: 3,
      parsed_resume:
        isUsingResume && currentParsed
          ? {
              summary: currentParsed.summary || "",
              skills: currentParsed.skills || [],
              technologies: currentParsed.technologies || [],
            }
          : {
              summary: "",
              skills: [],
              technologies: jdData.technologies || [],
            },
    };

    try {
      const startData = await startInterviewSession(payload);
      sessionStorage.setItem(`interview_${startData.session_id}`, JSON.stringify(startData));
      navigate(`/interview/${startData.session_id}?role=${encodeURIComponent(selectedRole)}&difficulty=${encodeURIComponent(selectedDifficulty)}`, {
        state: { initialData: startData },
      });
    } catch (err) {
      console.error("Launch interview failed:", err);
      toast.error(err.message || "Failed to initialize interview room.");
      setIsStarting(false);
    }
  };

  return (
    <AppShell>
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center gap-3 border-b border-[#262626] px-4 py-3 md:px-8 bg-[#0A0A0A]/40">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-[#A1A1A1] hover:text-white">
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2 text-xs">
          <Link to="/" className="text-[#A1A1A1] hover:text-white">Mock Interviews</Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300 font-medium">{jdData.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
        {/* Multi-Position Track Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-[#1F1F1F]">
          <span className="text-[11px] font-mono uppercase text-zinc-500 shrink-0 mr-1">Switch Track:</span>
          {Object.keys(ROLE_JDS).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedRole === r
                  ? "bg-[#FF6500]/15 text-[#FF6500] border border-[#FF6500]/50"
                  : "bg-[#0A0A0A] border border-[#262626] text-[#A1A1A1] hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Page Header */}
        <PageHeader
          title={jdData.title}
          description="Read the detailed role specification. Prepare your speech and optionally upload a resume context before connecting."
          badge={`${selectedDifficulty} level`}
          actions={
            <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[#262626] p-1 rounded-lg">
              {["Easy", "Intermediate", "Hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(d)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    selectedDifficulty === d
                      ? "bg-[#FF6500] text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          }
        />

        {/* Double Column Grid: Matches InterLeet Challenge / Setup Detail Structure */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN (2/3 Width): Job Specification */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-[#262626] bg-[#0A0A0A] p-6 md:p-8">
              {/* Role Title and Header */}
              <div className="border-b border-[#262626] pb-5">
                <Badge className="bg-[#FF6500]/10 text-[#FF6500] border-[#FF6500]/20 font-semibold mb-2">
                  JOB SPECIFICATION
                </Badge>
                <h2 className="text-2xl font-bold text-white tracking-tight">{jdData.title}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#A1A1A1]">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-zinc-500" /> {jdData.level}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-zinc-500" /> {jdData.salary} / year
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" /> 45 Minute Assessment
                  </span>
                </div>
              </div>

              {/* JD Body Details */}
              <div className="mt-6 space-y-6 text-sm text-zinc-300">
                {/* Overview */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">Role Overview</h3>
                  <p className="leading-relaxed text-zinc-300">{jdData.overview}</p>
                </div>

                {/* Resume overlay badge if active */}
                {useResume && resumeUploaded && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 text-xs flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      Resume Context Applied: Personalized questions will focus on your background and projects.
                    </span>
                  </div>
                )}

                {/* Responsibilities */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">Core Responsibilities</h3>
                  <ul className="space-y-2 text-xs leading-relaxed text-zinc-300 list-disc pl-5">
                    {jdData.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">Technical Qualifications</h3>
                  <ul className="space-y-2 text-xs leading-relaxed text-zinc-300 list-disc pl-5">
                    {jdData.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>

                {/* Probing Focus Areas */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">Interview Assessment Pillars</h3>
                  <ul className="space-y-2 text-xs leading-relaxed text-zinc-300 list-disc pl-5">
                    {jdData.focus_areas.map((fa, i) => (
                      <li key={i}>{fa}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN (1/3 Width): Key Technologies, Resume Tailoring, Diagnostics Checklist */}
          <div className="space-y-6">
            {/* Tech Stack Card */}
            <Card className="border-[#262626] bg-[#0A0A0A] p-5">
              <h3 className="text-sm font-semibold text-white">Key Technologies</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {jdData.technologies.map((tech) => (
                  <Badge
                    key={tech}
                    variant="outline"
                    className="font-mono text-[10px] bg-zinc-950/60 border-[#262626] text-zinc-300"
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Resume Tailoring Selector */}
            <Card className="border-[#262626] bg-[#0A0A0A] p-5">
              <h3 className="text-sm font-semibold text-white">Tailor Syllabus</h3>
              <p className="mt-1.5 text-xs text-[#A1A1A1] leading-relaxed">
                Provide resume context to align the AI's grading parameters and questions to your past work.
              </p>

              {/* Option toggle tab */}
              <div className="mt-4 flex rounded-md border border-[#262626] p-1 bg-black">
                <button
                  type="button"
                  onClick={() => setUseResume(false)}
                  className={`flex-1 rounded-sm py-1 text-center text-[11px] font-medium transition-all cursor-pointer ${
                    !useResume ? "bg-[#1A1A1A] text-white shadow-sm" : "text-[#A1A1A1] hover:text-white"
                  }`}
                >
                  Standard Syllabus
                </button>
                <button
                  type="button"
                  onClick={() => setUseResume(true)}
                  className={`flex-1 rounded-sm py-1 text-center text-[11px] font-medium transition-all cursor-pointer ${
                    useResume ? "bg-[#1A1A1A] text-white shadow-sm" : "text-[#A1A1A1] hover:text-white"
                  }`}
                >
                  Custom Resume
                </button>
              </div>

              {/* Upload controls */}
              {useResume && (
                <div className="mt-4 space-y-3">
                  {!resumeUploaded && (
                    <div className="group relative flex flex-col items-center justify-center rounded border border-dashed border-[#262626] bg-zinc-950/40 p-4 text-center hover:border-[#FF6500]/40 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <Upload className="mb-1.5 h-6 w-6 text-zinc-500 group-hover:text-[#FF6500] transition-colors" />
                      <p className="text-[11px] font-medium text-zinc-300 truncate max-w-full px-1">
                        {selectedFile ? selectedFile.name : "Select PDF resume"}
                      </p>
                      <p className="text-[9px] text-zinc-500">Auto-parsed upon selection • PDF up to 5MB</p>
                    </div>
                  )}

                  {isParsing && (
                    <div className="flex items-center justify-center gap-2 rounded border border-[#FF6500]/30 bg-[#FF6500]/10 p-3 text-xs text-[#FF6500]">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#FF6500] border-t-transparent" />
                      <span>Parsing resume & tailoring questions...</span>
                    </div>
                  )}

                  {resumeUploaded && parsedJD && (
                    <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span>Resume Parsed & Active</span>
                        </div>
                        <label className="text-[10px] text-zinc-400 hover:text-white cursor-pointer underline">
                          Replace PDF
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {selectedFile && (
                        <p className="text-[10px] font-mono text-zinc-400 truncate">
                          📄 {selectedFile.name}
                        </p>
                      )}

                      {parsedJD.summary && (
                        <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-2 italic">
                          "{parsedJD.summary}"
                        </p>
                      )}

                      {parsedJD.skills?.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                            Detected Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {parsedJD.skills.slice(0, 6).map((sk, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 text-[9px] text-emerald-300 font-mono"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {parsedJD.topics?.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                            Tailored Topics
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {parsedJD.topics.map((tp, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-300"
                              >
                                {tp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Diagnostics & Launch CTA */}
            <Card className="border-[#262626] bg-[#0A0A0A] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Diagnostics Checklist</h3>
              <p className="text-xs text-[#A1A1A1] leading-relaxed">
                Calibrate your speaker output and confirm browser microphone permissions before beginning.
              </p>

              <div className="space-y-2.5">
                {/* Speaker Test */}
                <button
                  type="button"
                  onClick={playTestSound}
                  className="w-full flex items-center justify-between rounded-lg border border-[#262626] bg-zinc-950/60 p-2.5 text-xs text-zinc-200 hover:border-zinc-700 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-[#FF6500]" />
                    <span>Test Audio Output</span>
                  </span>
                  {speakerVerified ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px]">Play Chime</span>
                  )}
                </button>

                {/* Mic Test */}
                <button
                  type="button"
                  onClick={requestMicPermission}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                    micPermission === "granted"
                      ? "border-emerald-800/40 bg-emerald-950/20 text-emerald-300"
                      : "border-[#262626] bg-zinc-950/60 text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-emerald-400" />
                    <span>Microphone Permission</span>
                  </span>
                  {micPermission === "granted" ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-[#FF6500] text-[10px] font-semibold">Connect Mic</span>
                  )}
                </button>

                {/* Live Volume Meter */}
                {micPermission === "granted" && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${volumeLevel}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-500 text-right font-mono">Volume Level: {volumeLevel}%</p>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartInterview}
                disabled={isStarting}
                className="w-full bg-[#FF6500] hover:bg-orange-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(255,101,0,0.3)] py-5 cursor-pointer"
              >
                {isStarting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
                    Connecting Sara AI...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 fill-white" />
                    Connect & Start Interview
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
