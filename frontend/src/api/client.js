/**
 * API client for the Interview AI service.
 * Supports direct communication with the FastAPI backend.
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/interview`;

export async function fetchPresets() {
  const res = await fetch(`${API_BASE}/presets`);
  if (!res.ok) throw new Error("Failed to load interview presets");
  return res.json();
}

export async function fetchRecentReports(userId = null) {
  const url = userId ? `${API_BASE}/reports/recent?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/reports/recent`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load recent reports");
  return res.json();
}

export async function startInterviewSession(payload) {
  const res = await fetch(`${API_BASE}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to start interview session");
  }
  return res.json();
}

export async function submitInterviewAnswer(payload) {
  const res = await fetch(`${API_BASE}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit answer");
  }
  return res.json();
}

export async function endInterviewSession(sessionId) {
  const res = await fetch(`${API_BASE}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to end interview");
  }
  return res.json();
}

export async function fetchSession(sessionId) {
  const res = await fetch(`${API_BASE}/${sessionId}`);
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

export async function fetchReport(sessionId) {
  const res = await fetch(`${API_BASE}/${sessionId}/report`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

export async function parseResume(formDataOrText) {
  let options = {};
  if (formDataOrText instanceof FormData) {
    options = { method: "POST", body: formDataOrText };
  } else {
    options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: formDataOrText }),
    };
  }
  const res = await fetch(`${API_BASE}/parse-resume`, options);
  if (!res.ok) throw new Error("Failed to parse resume");
  return res.json();
}

export function getTtsAudioUrl(text, voice = "simran_en_customer") {
  return `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
}

export async function transcribeAudio(audioBlob, filename = "candidate_voice.webm") {
  const formData = new FormData();
  formData.append("file", audioBlob, filename);

  const res = await fetch(`${API_BASE}/stt`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to transcribe audio");
  }
  return res.json();
}

