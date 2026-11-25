import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, PhoneOff, ArrowLeft, MessageSquare,
  Send, Loader2, Volume2, VolumeX, CheckCircle2,
  Sparkles, RotateCcw, HelpCircle, Clock, Radio
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchSession,
  submitInterviewAnswer,
  endInterviewSession,
  getTtsAudioUrl,
  transcribeAudio
} from "@/api/client";

// Browser SpeechRecognition
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

let _activeAudio = null;

const PHASE = {
  IDLE: "idle",
  SPEAKING: "speaking",
  LISTENING: "listening",
  REVIEWING: "reviewing",
  SUBMITTING: "submitting",
  COMPLETED: "completed",
};

// ─── Sara AI Avatar ─────────────────────────────────────────────────────────
function AIAvatar({ phase, isSpeakingActive, isUserTalking }) {
  const isSaraSpeaking = phase === PHASE.SPEAKING || isSpeakingActive;
  const isThinking = phase === PHASE.IDLE || phase === PHASE.SUBMITTING;

  return (
    <div className="relative flex items-center justify-center select-none py-6">
      {/* Outer pulse ring - only glows when someone is actually talking */}
      <span
        className={`absolute rounded-full border transition-all duration-300 ${
          isSaraSpeaking
            ? "border-[#FF6500]/30 animate-pulse scale-105"
            : isUserTalking
            ? "border-emerald-500/30 animate-pulse scale-105"
            : "border-zinc-800/40 scale-100"
        }`}
        style={{
          width: isSaraSpeaking || isUserTalking ? 230 : 200,
          height: isSaraSpeaking || isUserTalking ? 230 : 200,
          opacity: isSaraSpeaking || isUserTalking ? 0.45 : 0.15,
        }}
      />

      {/* Middle ring */}
      <span
        className={`absolute rounded-full border transition-all duration-300 ${
          isSaraSpeaking
            ? "border-[#FF6500]/40"
            : isUserTalking
            ? "border-emerald-500/40"
            : "border-zinc-800/30"
        }`}
        style={{
          width: isSaraSpeaking || isUserTalking ? 185 : 160,
          height: isSaraSpeaking || isUserTalking ? 185 : 160,
          opacity: isSaraSpeaking || isUserTalking ? 0.6 : 0.2,
        }}
      />

      {/* Inner glow */}
      <span
        className={`absolute rounded-full transition-all duration-300 ${
          isSaraSpeaking
            ? "bg-[#FF6500]/15"
            : isUserTalking
            ? "bg-emerald-500/10"
            : "bg-transparent"
        }`}
        style={{ width: 140, height: 140 }}
      />

      {/* Avatar S Circle */}
      <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6500] via-orange-600 to-amber-600 text-3xl font-bold text-white shadow-[0_0_40px_rgba(255,101,0,0.35)]">
        S
      </div>

      {/* State Badge */}
      <div className="absolute -bottom-2 flex items-center gap-1.5 text-xs font-medium">
        {isThinking ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
            <span className="text-amber-400">Processing with Gemini...</span>
          </>
        ) : isSaraSpeaking ? (
          <>
            <span className="h-2 w-2 animate-ping rounded-full bg-[#FF6500]" />
            <span className="text-[#FF6500] font-semibold">Sara is speaking...</span>
          </>
        ) : isUserTalking ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-semibold">Voice detected: recording audio...</span>
          </>
        ) : phase === PHASE.LISTENING || phase === PHASE.REVIEWING ? (
          <>
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-400">Microphone ready: start speaking</span>
          </>
        ) : (
          <span className="text-zinc-500">Ready</span>
        )}
      </div>
    </div>
  );
}

// ─── Real Audio Visualizer (Fixed: strictly reflects true microphone levels) ──
function AudioVisualizer({ levels, isStreaming, isSaraSpeaking }) {
  // Real voice input is present when audio level > 6
  const isMicInputActive = isStreaming && levels.some((lvl) => lvl > 6);
  const active = isSaraSpeaking || isMicInputActive;

  return (
    <div className="flex items-center justify-center gap-1.5 h-6">
      {levels.map((lvl, i) => {
        const heightPct = active
          ? isSaraSpeaking
            ? Math.max(20, Math.floor(Math.sin((i + Date.now() / 200) * 1.5) * 40 + 50))
            : Math.max(16, Math.min(100, lvl))
          : 12;

        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              active
                ? isSaraSpeaking
                  ? "bg-gradient-to-t from-[#FF6500] via-orange-500 to-amber-400 opacity-90"
                  : "bg-gradient-to-t from-emerald-500 via-teal-400 to-[#FF6500] opacity-95"
                : "bg-zinc-800/80 opacity-25"
            }`}
            style={{
              height: `${heightPct}%`,
            }}
          />
        );
      })}
    </div>
  );
}

export function LiveInterview() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = searchParams.get("role") || "Senior Backend Engineer";
  const difficulty = searchParams.get("difficulty") || "Intermediate";

  // Voice State Machine
  const [phase, _setPhase] = useState(PHASE.IDLE);
  const phaseRef = useRef(PHASE.IDLE);
  const setPhase = useCallback((p) => {
    phaseRef.current = p;
    _setPhase(p);
  }, []);

  const [session, setSession] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [guidance, setGuidance] = useState("");
  const [showGuidance, setShowGuidance] = useState(false);
  const [transcriptList, setTranscriptList] = useState([]);

  // Live Speech Inputs
  const [textInput, setTextInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const textInputRef = useRef("");
  const interimTextRef = useRef("");

  // Mode & Audio Controls
  const [isTextMode, setIsTextMode] = useState(false);
  const isTextModeRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [turnsCount, setTurnsCount] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(8);

  // 5-Second Silence Auto-Submit Timer
  const [countdownPercent, setCountdownPercent] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const SILENCE_TIMEOUT_MS = 5000; // 5 Seconds

  // Real-time Mic Audio Stream Levels (Web Audio API Analyser)
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);

  // Sarvam AI MediaRecorder for continuous recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const hasVocalizedRef = useRef(false);
  const lastVoiceTimeRef = useRef(0);
  const vocalFrameCountRef = useRef(0);
  const isEndingRef = useRef(false);

  // Speech Recognition & TTS Handles
  const recognitionRef = useRef(null);
  const isSTTActiveRef = useRef(false);
  const startSTTRef = useRef(null);
  const audioRef = useRef(null);
  const transcriptBottomRef = useRef(null);
  const submitRef = useRef(null);

  // Keep references in sync
  useEffect(() => {
    textInputRef.current = textInput;
  }, [textInput]);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isTextModeRef.current = isTextMode;
  }, [isTextMode]);

  // Scroll transcript down automatically
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptList, interimText]);

  // ─── Silence Detection System (5-Second Auto-Submit Timer) ────────────────
  const clearSilence = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownPercent(0);
    setSecondsRemaining(0);
  }, []);

  // ─── Real Web Audio API Analyser & MediaRecorder ──────────────────────────
  const startAnalyserAndRecorder = useCallback(async () => {
    try {
      if (!micStreamRef.current || !micStreamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        micStreamRef.current = stream;
      }

      const stream = micStreamRef.current;

      // 1. Web Audio Context for visualizer & responsive voice activity detection
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          try { await ctx.resume(); } catch (_) {}
        }

        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.45;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDomainArray = new Uint8Array(analyserRef.current.fftSize);

        if (!animFrameRef.current) {
          const tick = () => {
            if (!analyserRef.current) return;
            if (phaseRef.current !== PHASE.LISTENING && phaseRef.current !== PHASE.REVIEWING) {
              setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
              animFrameRef.current = requestAnimationFrame(tick);
              return;
            }
            analyserRef.current.getByteFrequencyData(dataArray);
            analyserRef.current.getByteTimeDomainData(timeDomainArray);

            // Compute time-domain RMS so normal speaking volume is detected immediately
            let sumSquares = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
              const normalized = (timeDomainArray[i] - 128) / 128;
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / timeDomainArray.length);
            const voiceEnergy = Math.min(100, Math.round(rms * 350));

            // Focus visualizer bars on voice-band frequencies (first ~40% of bins, ~0-8kHz)
            const barsCount = 10;
            const voiceBins = Math.max(barsCount, Math.floor(bufferLength * 0.4));
            const bucketSize = Math.max(1, Math.floor(voiceBins / barsCount));
            const newLevels = [];

            for (let i = 0; i < barsCount; i++) {
              let sum = 0;
              for (let j = 0; j < bucketSize; j++) {
                sum += dataArray[i * bucketSize + j] || 0;
              }
              const avg = sum / bucketSize;
              newLevels.push(Math.min(100, Math.round((avg / 180) * 100)));
            }

            setAudioLevels(newLevels);

            // Require sustained voice energy (> 14 for ~12 frames / ~200ms) so ambient noise
            // or mic clicks never trigger the 5-second auto-submit timer by themselves
            if (voiceEnergy > 14) {
              vocalFrameCountRef.current += 1;
              if (vocalFrameCountRef.current >= 12) {
                hasVocalizedRef.current = true;
                lastVoiceTimeRef.current = Date.now();
                if (silenceTimerRef.current) {
                  clearSilence();
                }
                if (phaseRef.current === PHASE.LISTENING) {
                  setPhase(PHASE.REVIEWING);
                }
              }
            } else {
              vocalFrameCountRef.current = 0;
              if (hasVocalizedRef.current && voiceEnergy > 12) {
                lastVoiceTimeRef.current = Date.now();
                if (silenceTimerRef.current) {
                  clearSilence();
                }
              }
            }

            animFrameRef.current = requestAnimationFrame(tick);
          };

          animFrameRef.current = requestAnimationFrame(tick);
        }
      }

      // 2. High-Fidelity MediaRecorder for Sarvam AI Transcription
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

        const options = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(250); // 250ms chunks
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      console.warn("Microphone or MediaRecorder access error:", err);
    }
  }, [clearSilence, setPhase]);

  const stopAnalyserAndRecorder = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
      mediaRecorderRef.current = null;
    }
  }, []);

  // ─── Safely Finalize & Extract Audio Blob for Sarvam AI ────────────────────
  const extractRecordedAudioBlob = () => {
    return new Promise((resolve) => {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === "inactive") {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          resolve(blob);
        } else {
          resolve(null);
        }
        return;
      }

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      rec.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, {
            type: rec.mimeType || "audio/webm",
          });
          resolve(blob);
        } else {
          resolve(null);
        }
      };

      try {
        rec.stop();
      } catch (_) {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          resolve(blob);
        } else {
          resolve(null);
        }
      }
    });
  };

  const startSilenceTimer = useCallback(() => {
    clearSilence();
    if (isTextModeRef.current) return;

    const startTime = Date.now();
    setSecondsRemaining(5);
    setCountdownPercent(100);

    // Update progress bar and countdown display every 100ms
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, SILENCE_TIMEOUT_MS - elapsed);
      const pct = Math.max(0, (remaining / SILENCE_TIMEOUT_MS) * 100);
      setCountdownPercent(pct);
      setSecondsRemaining(Math.ceil(remaining / 1000));
    }, 100);

    // Trigger auto-submit after 5 seconds of silence
    silenceTimerRef.current = setTimeout(() => {
      clearSilence();
      if (submitRef.current) {
        submitRef.current();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilence]);

  // ─── Pure Sarvam AI Bulbul Audio Playback (Exclusively Sarvam AI) ─────────
  const lastSpokenRef = useRef("");

  const stopAllAudio = () => {
    if (_activeAudio) {
      try {
        _activeAudio.pause();
        _activeAudio.currentTime = 0;
        _activeAudio.src = "";
      } catch (_) {}
      _activeAudio = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
      } catch (_) {}
      audioRef.current = null;
    }
  };

  const speakInterviewer = (text) => {
    if (!text || isMutedRef.current) {
      setPhase(PHASE.LISTENING);
      return;
    }

    // Disconnect mic & stop any existing audio so person cannot speak while AI speaks
    clearSilence();
    stopSTT();
    stopAllAudio();
    audioChunksRef.current = [];
    hasVocalizedRef.current = false;
    vocalFrameCountRef.current = 0;
    lastVoiceTimeRef.current = 0;
    lastSpokenRef.current = text;
    setPhase(PHASE.SPEAKING);

    try {
      const audioUrl = getTtsAudioUrl(text, "simran_en_customer");
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      _activeAudio = audio;

      audio.onended = () => {
        audioRef.current = null;
        _activeAudio = null;
        setPhase(PHASE.LISTENING);
      };

      audio.onerror = (e) => {
        console.warn("Sarvam AI Audio playback error:", e);
        audioRef.current = null;
        _activeAudio = null;
        setPhase(PHASE.LISTENING);
      };

      audio.play().catch((err) => {
        console.warn("Autoplay blocked or playback failed:", err);
        audioRef.current = null;
        _activeAudio = null;
        setPhase(PHASE.LISTENING);
        if (err?.name === "NotAllowedError") {
          toast("Click 'Repeat Question' to hear the interviewer.", { icon: "🔊" });
        }
      });
    } catch (err) {
      console.warn("Sarvam audio setup error:", err);
      setPhase(PHASE.LISTENING);
    }
  };

  // ─── Continuous Voice Capture & On-Screen Display ─────────────────────────
  const stopSTT = useCallback(() => {
    isSTTActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    stopAnalyserAndRecorder();
    setInterimText("");
  }, [stopAnalyserAndRecorder]);

  const startSTT = useCallback(() => {
    if (isMutedRef.current || isTextModeRef.current) return;
    if (phaseRef.current === PHASE.SPEAKING || phaseRef.current === PHASE.SUBMITTING) return;

    // Start hardware audio capture & real decibel analyser
    startAnalyserAndRecorder();

    // Do not tear down & restart SpeechRecognition if it is already actively listening
    // (e.g. when phase transitions from LISTENING -> REVIEWING on first word)
    if (isSTTActiveRef.current && recognitionRef.current) {
      return;
    }

    // Start browser SpeechRecognition for live on-screen instant typing feedback
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }

      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.maxAlternatives = 1;
        recognitionRef.current = rec;
        isSTTActiveRef.current = true;

        rec.onresult = (e) => {
          let currentInterim = "";
          let newFinal = "";

          for (let i = e.resultIndex; i < e.results.length; i++) {
            const item = e.results[i];
            if (item.isFinal) {
              newFinal += item[0].transcript + " ";
            } else {
              currentInterim += item[0].transcript;
            }
          }

          // Real-time live on-screen text as candidate speaks
          if (currentInterim.trim()) {
            setInterimText(currentInterim);
            hasVocalizedRef.current = true;
            lastVoiceTimeRef.current = Date.now();
            clearSilence();
            if (phaseRef.current !== PHASE.REVIEWING) {
              setPhase(PHASE.REVIEWING);
            }
          }

          if (newFinal.trim()) {
            setInterimText("");
            hasVocalizedRef.current = true;
            lastVoiceTimeRef.current = Date.now();
            setTextInput((prev) => {
              const trimmed = prev.trim();
              const addition = newFinal.trim();
              const updated = trimmed ? `${trimmed} ${addition}` : addition;
              textInputRef.current = updated;
              return updated;
            });
            setPhase(PHASE.REVIEWING);
          }
        };

        rec.onerror = (e) => {
          if (e.error === "not-allowed") {
            toast.error("Microphone access blocked. Please allow mic permissions in your browser.");
          }
        };

        rec.onend = () => {
          setInterimText("");
          recognitionRef.current = null;
          // Restart on-screen STT handle smoothly while listening
          if (
            isSTTActiveRef.current &&
            (phaseRef.current === PHASE.LISTENING || phaseRef.current === PHASE.REVIEWING) &&
            !isMutedRef.current &&
            !isTextModeRef.current
          ) {
            setTimeout(() => {
              if (
                isSTTActiveRef.current &&
                (phaseRef.current === PHASE.LISTENING || phaseRef.current === PHASE.REVIEWING) &&
                !isMutedRef.current &&
                !isTextModeRef.current
              ) {
                startSTTRef.current?.();
              }
            }, 200);
          }
        };

        rec.start();
      } catch (err) {
        console.warn("Browser STT init error:", err);
      }
    }
  }, [clearSilence, setPhase, startAnalyserAndRecorder, startSilenceTimer]);

  useEffect(() => {
    startSTTRef.current = startSTT;
  }, [startSTT]);

  // STT Lifecycle
  useEffect(() => {
    if (phase === PHASE.LISTENING || phase === PHASE.REVIEWING) {
      if (!isTextMode && !isMuted) {
        startSTT();
      }
    } else {
      stopSTT();
    }
  }, [phase, isTextMode, isMuted, startSTT, stopSTT]);

  // Voice Activity Silence Watcher (auto-submits only after real sustained speech + pause)
  useEffect(() => {
    if (phase !== PHASE.REVIEWING || isTextMode || isMuted) return;

    const watcher = setInterval(() => {
      const hasSpoken =
        hasVocalizedRef.current ||
        textInputRef.current.trim().length > 0 ||
        interimTextRef.current.trim().length > 0;
      if (
        hasSpoken &&
        lastVoiceTimeRef.current > 0 &&
        !silenceTimerRef.current &&
        Date.now() - lastVoiceTimeRef.current >= 1800
      ) {
        startSilenceTimer();
      }
    }, 300);

    return () => clearInterval(watcher);
  }, [phase, isTextMode, isMuted, startSilenceTimer]);

  // ─── Initialize Session ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function init() {
      let data = null;
      const cached = sessionStorage.getItem(`interview_${sessionId}`);
      if (cached) {
        try { data = JSON.parse(cached); } catch (_) {}
      }

      if (!data) {
        try {
          data = await fetchSession(sessionId);
        } catch (err) {
          if (isMounted) toast.error("Could not load session.");
          return;
        }
      }

      if (isMounted && data) {
        setSession(data);
        const msg = data.message || data.question || "Hello! Tell me about yourself and your technical background.";
        setCurrentMessage(msg);
        setGuidance(data.answer_guidance || "");
        setTurnsCount(data.questions_asked_count || 1);
        setMaxQuestions(data.max_questions || 8);

        setTranscriptList([
          {
            from: "ai",
            text: msg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        speakInterviewer(msg);
      }
    }

    init();

    return () => {
      isMounted = false;
      clearSilence();
      stopAllAudio();
      stopSTT();
    };
  }, [sessionId]); // eslint-disable-line

  // End session & show report if user presses browser Back button
  useEffect(() => {
    const onPopState = () => {
      if (!isEndingRef.current && phaseRef.current !== PHASE.COMPLETED) {
        isEndingRef.current = true;
        clearSilence();
        stopAllAudio();
        stopSTT();
        endInterviewSession(sessionId).catch(() => {});
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [sessionId, clearSilence, stopSTT]);

  // ─── Submit Answer Handler (Powered by Sarvam AI Speech-to-Text) ─────────
  const handleSubmitAnswer = async () => {
    clearSilence();
    setPhase(PHASE.SUBMITTING);

    let answer = textInputRef.current.trim() || interimTextRef.current.trim();
    setIsTranscribing(true);

    try {
      // 1. Safely extract audio blob BEFORE stopping hardware
      const shouldTranscribeVoice = !isTextModeRef.current && hasVocalizedRef.current;
      const audioBlob = shouldTranscribeVoice ? await extractRecordedAudioBlob() : null;

      // 2. Transcribe voice audio with Sarvam AI
      if (audioBlob && audioBlob.size > 1500) {
        try {
          const sttResult = await transcribeAudio(audioBlob, "candidate_voice.webm");
          if (sttResult && sttResult.transcript && sttResult.transcript.trim()) {
            const highPrecisionText = sttResult.transcript.trim();
            answer = highPrecisionText;
            setTextInput(highPrecisionText);
            textInputRef.current = highPrecisionText;
            const providerLabel =
              sttResult.provider === "sarvam_ai" ? "Sarvam AI (Saaras v4)" : "Groq Whisper Large";
            toast.success(`Voice transcribed via ${providerLabel}`);
          }
        } catch (sttErr) {
          console.warn("Server STT error, falling back to captured text:", sttErr);
          if (!answer) {
            toast.error(`Voice transcription failed: ${sttErr.message || "Check backend STT service"}`);
          }
        }
      }
    } catch (e) {
      console.warn("Audio extraction error:", e);
    } finally {
      setIsTranscribing(false);
      // Cleanly stop hardware and reset audio chunks for this turn
      stopSTT();
      stopAllAudio();
      audioChunksRef.current = [];
      hasVocalizedRef.current = false;
      lastVoiceTimeRef.current = 0;
      vocalFrameCountRef.current = 0;
    }

    if (!answer) {
      toast.error("No answer detected. Please speak into the mic or type your response.");
      setPhase(PHASE.LISTENING);
      return;
    }

    // Append to transcript
    const userMsg = {
      from: "candidate",
      text: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTranscriptList((prev) => [...prev, userMsg]);
    setTextInput("");
    textInputRef.current = "";
    setInterimText("");

    try {
      const res = await submitInterviewAnswer({
        session_id: sessionId,
        answer: answer,
        topic: session?.topic || "",
      });

      if (res.completed) {
        isEndingRef.current = true;
        clearSilence();
        stopSTT();
        stopAllAudio();
        setPhase(PHASE.COMPLETED);
        toast.success("Interview completed! Generating scorecard...");
        navigate(`/report/${sessionId}`, { state: { report: res.report } });
        return;
      }

      // Next Question from Gemini 3.8 Flash
      setSession(res);
      setTurnsCount(res.questions_asked_count || turnsCount + 1);
      const nextMsg = res.message || res.question;
      setCurrentMessage(nextMsg);
      setGuidance(res.answer_guidance || "");

      // Append Sara's next question to transcript
      setTranscriptList((prev) => [
        ...prev,
        {
          from: "ai",
          text: nextMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          evaluation: res.evaluation,
        },
      ]);

      speakInterviewer(nextMsg);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit answer.");
      setPhase(PHASE.LISTENING);
    }
  };

  useEffect(() => {
    submitRef.current = handleSubmitAnswer;
  });

  // Go Back -> End Interview & Show Result Output
  const handleBackAndShowReport = async () => {
    isEndingRef.current = true;
    clearSilence();
    stopSTT();
    stopAllAudio();
    setPhase(PHASE.SUBMITTING);
    toast.loading("Ending interview & generating your report...", { id: "ending-session" });

    try {
      const res = await endInterviewSession(sessionId);
      toast.dismiss("ending-session");
      navigate(`/report/${sessionId}`, { state: { report: res.report }, replace: true });
    } catch (_) {
      toast.dismiss("ending-session");
      navigate(`/report/${sessionId}`, { replace: true });
    }
  };

  // End Interview Early
  const handleEndEarly = async () => {
    if (!window.confirm("Are you sure you want to finish the interview now? A partial scorecard will be calculated.")) {
      return;
    }
    isEndingRef.current = true;
    clearSilence();
    stopSTT();
    stopAllAudio();
    setPhase(PHASE.SUBMITTING);

    try {
      const res = await endInterviewSession(sessionId);
      navigate(`/report/${sessionId}`, { state: { report: res.report } });
    } catch (_) {
      navigate(`/report/${sessionId}`);
    }
  };

  const isUserTalking = audioLevels.some((lvl) => lvl > 6);
  const isCandidateStreaming =
    (phase === PHASE.LISTENING || phase === PHASE.REVIEWING) && !isMuted && !isTextMode;

  return (
    <AppShell>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#262626] px-4 py-3 md:px-8 bg-[#0A0A0A]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackAndShowReport}
            disabled={phase === PHASE.SUBMITTING}
            title="End interview and view results"
            className="h-8 w-8 text-[#A1A1A1] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{role}</span>
              <Badge variant="outline" className="font-mono text-[10px] uppercase border-[#262626] text-[#FF6500]">
                {difficulty}
              </Badge>
              <span className="text-[10px] font-mono text-zinc-500">
                Question {turnsCount}/{maxQuestions}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              isMutedRef.current = nextMuted;
              if (nextMuted) {
                stopSTT();
                clearSilence();
              } else if (phase === PHASE.LISTENING || phase === PHASE.REVIEWING) {
                startSTT();
              }
            }}
            className="h-8 text-xs border-[#262626] hover:bg-[#1A1A1A] cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400 mr-1.5" /> : <Volume2 className="h-3.5 w-3.5 text-zinc-400 mr-1.5" />}
            <span>{isMuted ? "Unmute AI" : "Mute AI"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleEndEarly}
            className="h-8 text-xs border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 cursor-pointer"
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            <span>End Session</span>
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Left Stage + Right Transcript */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 grid gap-6 lg:grid-cols-12 min-h-[calc(100vh-140px)]">
        {/* LEFT COLUMN (7/12): Sara Avatar & Active Question Stage */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <Card className="border-[#262626] bg-[#0A0A0A] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden flex-1 min-h-[360px]">
            {/* Background gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF6500]/5 via-transparent to-transparent pointer-events-none" />

            <AIAvatar
              phase={phase}
              isSpeakingActive={phase === PHASE.SPEAKING}
              isUserTalking={isUserTalking}
            />

            {/* Audio Visualizer (Fixed: only animates when voice input is actually detected) */}
            <div className="mt-2 w-full">
              <AudioVisualizer
                levels={audioLevels}
                isStreaming={isCandidateStreaming}
                isSaraSpeaking={phase === PHASE.SPEAKING}
              />
            </div>

            {/* Active Question Box */}
            <div className="mt-6 max-w-xl text-left bg-[#141414]/90 border border-[#262626] rounded-xl p-4 w-full shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-[#FF6500] font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Question
                </span>
                {guidance && (
                  <button
                    onClick={() => setShowGuidance(!showGuidance)}
                    className="text-[11px] text-[#A1A1A1] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="h-3 w-3 text-[#FF6500]" />
                    <span>{showGuidance ? "Hide rubric" : "What is Sara testing?"}</span>
                  </button>
                )}
              </div>

              <p className="text-sm font-medium text-white leading-relaxed">
                "{currentMessage}"
              </p>

              {showGuidance && guidance && (
                <div className="mt-3 pt-3 border-t border-[#262626] text-xs text-[#A1A1A1] leading-relaxed">
                  <span className="font-semibold text-zinc-300">Expected Signal:</span> {guidance}
                </div>
              )}
            </div>
          </Card>

          {/* Response Dock */}
          <Card className="border-[#262626] bg-[#0A0A0A] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>Your Candidate Answer</span>
                {isCandidateStreaming && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] transition-all duration-200 ${
                      isUserTalking
                        ? "bg-emerald-950/60 border-emerald-500 text-emerald-400 animate-pulse font-bold"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <Radio className="h-2.5 w-2.5 mr-1" />
                    {isUserTalking ? "Recording Voice..." : "Mic Ready"}
                  </Badge>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isTextMode;
                  setIsTextMode(nextMode);
                  isTextModeRef.current = nextMode;
                  clearSilence();
                  if (nextMode) stopSTT();
                  else if (phase === PHASE.LISTENING || phase === PHASE.REVIEWING) startSTT();
                }}
                className="text-xs text-[#FF6500] hover:underline cursor-pointer"
              >
                {isTextMode ? "Switch to Voice Mode (Sarvam AI STT)" : "Switch to Keyboard / Text Mode"}
              </button>
            </div>

            {/* Real-time Display of What the User Speaks */}
            <div className="relative">
              <textarea
                rows={3}
                value={textInput}
                disabled={phase === PHASE.SPEAKING || phase === PHASE.SUBMITTING}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  clearSilence();
                }}
                placeholder={
                  phase === PHASE.SPEAKING
                    ? "Sara is speaking... Please listen (microphone paused)"
                    : isCandidateStreaming
                    ? "Speak into your microphone continuously... Sarvam AI will transcribe your full answer with high accuracy"
                    : "Type or speak your response..."
                }
                className="w-full rounded-lg border border-[#262626] bg-black p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#FF6500] resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Real-time live streaming interim text preview */}
              {interimText && (
                <div className="absolute bottom-3 left-3 right-3 text-xs text-amber-300/90 bg-black/95 px-2.5 py-1.5 rounded border border-amber-500/40 flex items-center gap-2 animate-pulse shadow-md">
                  <Mic className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate italic">"{interimText}"</span>
                </div>
              )}
            </div>

            {/* 5-Second Silence Auto-Submit Countdown Bar */}
            {secondsRemaining > 0 && (
              <div className="rounded-lg bg-[#141414] border border-[#FF6500]/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#FF6500] animate-spin" />
                    <span>5s pause detected. Auto-submitting in <strong className="text-[#FF6500] font-mono">{secondsRemaining}s</strong></span>
                  </span>
                  <button
                    onClick={clearSilence}
                    className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Pause Timer / Keep Speaking
                  </button>
                </div>
                {/* Smooth Progress Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-[#FF6500] h-full transition-all duration-100 ease-linear"
                    style={{ width: `${countdownPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speakInterviewer(currentMessage)}
                  disabled={phase === PHASE.SUBMITTING}
                  className="text-xs border-[#262626] hover:bg-[#1A1A1A] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Repeat Question</span>
                </Button>

                {!isTextMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={phase === PHASE.SPEAKING || phase === PHASE.SUBMITTING}
                    onClick={() => {
                      stopSTT();
                      setTimeout(() => startSTT(), 150);
                    }}
                    className={`text-xs border-[#262626] cursor-pointer ${
                      isUserTalking
                        ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/20"
                        : "hover:bg-[#1A1A1A]"
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5 mr-1" />
                    <span>{phase === PHASE.SPEAKING ? "Mic Paused" : isUserTalking ? "Recording Voice" : "Restart Mic"}</span>
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSubmitAnswer}
                disabled={phase === PHASE.SPEAKING || phase === PHASE.SUBMITTING || isTranscribing}
                className="bg-[#FF6500] hover:bg-orange-600 text-white font-semibold text-xs shadow-[0_0_15px_rgba(255,101,0,0.3)] cursor-pointer disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Transcribing with Sarvam AI...</span>
                  </>
                ) : phase === PHASE.SUBMITTING ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Evaluating with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <Send className="h-3.5 w-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN (5/12): Live Transcript Log */}
        <div className="lg:col-span-5 flex flex-col">
          <Card className="border-[#262626] bg-[#0A0A0A] p-4 flex-1 flex flex-col h-full max-h-[700px] overflow-hidden">
            <div className="border-b border-[#262626] pb-3 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Live Transcript</span>
              <span className="text-[10px] font-mono text-zinc-500">{transcriptList.length} Messages</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {transcriptList.map((msg, idx) => {
                const isAI = msg.from === "ai";
                return (
                  <div key={idx} className={`flex flex-col ${isAI ? "items-start" : "items-end"}`}>
                    <div className="mb-1 flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-300">{isAI ? "Sara AI" : "You"}</span>
                      <span className="font-mono">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isAI
                          ? "rounded-tl-sm bg-[#141414] border border-[#262626] text-zinc-200"
                          : "rounded-tr-sm bg-[#FF6500] text-white font-medium"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.evaluation && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Score: {msg.evaluation.score ?? 7}/10</span>
                        {msg.evaluation.summary && (
                          <span className="text-zinc-500 truncate max-w-[200px]">&bull; {msg.evaluation.summary}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Candidate Live Talking Bubble in Transcript */}
              {interimText && (
                <div className="flex flex-col items-end animate-pulse">
                  <div className="mb-1 flex items-center gap-2 text-[10px] text-amber-400">
                    <span className="font-semibold">You (Speaking...)</span>
                  </div>
                  <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-orange-950/40 border border-orange-500/30 px-3.5 py-2 text-xs italic text-amber-200">
                    {interimText}
                  </div>
                </div>
              )}

              <div ref={transcriptBottomRef} />
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
