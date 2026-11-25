import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check, X, ArrowRight, Loader2, AlertTriangle, Trophy,
  Target, TrendingUp, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { fetchReport } from "@/api/client";

// ─── Score Badge ─────────────────────────────────────────────────────────────
function ScoreRing({ value, label }) {
  const color =
    value >= 80 ? "#22c55e" : value >= 60 ? "#FF6500" : "#ef4444";
  return (
    <Card className="border-[#262626] bg-[#0A0A0A] p-5 flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={34} fill="none" stroke="#1f1f1f" strokeWidth={8} />
          <circle
            cx={40}
            cy={40}
            r={34}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={`${(value / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <span className="absolute text-xl font-bold text-white">{value}</span>
      </div>
      <p className="text-[11px] font-mono uppercase tracking-widest text-[#A1A1A1] text-center">
        {label}
      </p>
    </Card>
  );
}

// ─── Topic Evaluation Row ─────────────────────────────────────────────────────
function TopicRow({ item }) {
  const score = item.score ?? item.s ?? 7;
  const color =
    score >= 8
      ? "text-emerald-400 border-emerald-800/40 bg-emerald-950/20"
      : score >= 6
      ? "text-amber-400 border-amber-800/40 bg-amber-950/20"
      : "text-red-400 border-red-800/40 bg-red-950/20";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#262626] bg-[#141414]/50 p-3">
      <Badge className={`shrink-0 font-mono text-xs ${color} border`}>
        {score}/10
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100">{item.topic || item.axis}</p>
        {item.summary && (
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">
            {item.summary}
          </p>
        )}
      </div>
    </div>
  );
}

export function Report() {
  const { id } = useParams();
  const location = useLocation();
  const initialReport = location.state?.report || null;
  const [report, setReport] = useState(initialReport);
  const [reportLoading, setReportLoading] = useState(!initialReport);
  const [reportError, setReportError] = useState("");
  const [expandedTurns, setExpandedTurns] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        if (!initialReport) setReportLoading(true);
        const data = await fetchReport(id);
        if (isMounted) {
          setReport(data);
          setReportLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          if (!initialReport) {
            setReportError("Session report could not be retrieved.");
          }
          setReportLoading(false);
        }
      }
    }
    load();
    return () => { isMounted = false; };
  }, [id]); // eslint-disable-line

  const toggleTurn = (idx) => {
    setExpandedTurns((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (reportLoading) {
    return (
      <AppShell>
        <div className="space-y-6 px-4 py-8 md:px-8 animate-pulse max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-b border-[#262626] bg-[#0A0A0A] p-5 rounded-xl">
            <div className="space-y-2 w-1/3">
              <div className="h-5 w-32 rounded bg-zinc-800/40" />
              <div className="h-3 w-48 rounded bg-zinc-800/20" />
            </div>
            <div className="h-8 w-24 rounded bg-zinc-800/40" />
          </div>

          <div className="border border-[#262626] bg-[#0A0A0A] p-6 rounded-xl flex items-center gap-6">
            <div className="w-20 h-20 rounded-full border-4 border-dashed border-zinc-800/60 shrink-0" />
            <div className="space-y-2.5 w-2/3">
              <div className="h-4.5 w-40 rounded bg-zinc-800/40" />
              <div className="h-3.5 w-full rounded bg-zinc-800/20" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (reportError || !report) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm font-semibold text-zinc-200">Report not found</p>
          <p className="text-xs text-zinc-500">{reportError || "This session may have already expired."}</p>
          <Button asChild className="mt-2 bg-[#FF6500] hover:bg-orange-600 text-white">
            <Link to="/">Run another interview</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const role = report.role || "Software Engineer";
  const difficulty = report.difficulty || report.interview_type || "technical";
  const avg10 = report.average_score ?? 0;
  const overallScore = Math.round(
    report.overall_score ?? (avg10 * 10)
  );

  const rawScores = report.scores || {};
  const matrix = report.performance_matrix || {};
  const scoreCards = [
    {
      k: "Technical",
      v: rawScores.technical ?? rawScores.technical_knowledge ?? (matrix.correctness != null ? matrix.correctness * 10 : overallScore),
    },
    {
      k: "Communication",
      v: rawScores.communication ?? rawScores.communication_skills ?? (matrix.communication != null ? matrix.communication * 10 : overallScore),
    },
    {
      k: "Problem Solving",
      v: rawScores.problem_solving ?? rawScores.problem_solving_ability ?? (matrix.reasoning != null ? matrix.reasoning * 10 : overallScore),
    },
    { k: "Overall", v: overallScore },
  ].map((s) => ({ ...s, v: Math.min(100, Math.max(0, Math.round(s.v))) }));

  // Radar data built dynamically from topic evaluations, topic scores, or performance matrix
  let radarData = [];
  if (Array.isArray(report.topic_evaluations) && report.topic_evaluations.length > 0) {
    radarData = report.topic_evaluations.map((t) => ({
      axis: t.topic,
      s: Math.min(Math.round((t.score ?? 0) * 10), 100),
      score: t.score ?? 0,
      summary: t.summary,
      topic: t.topic,
    }));
  } else if (report.topic_scores && Object.keys(report.topic_scores).length > 0) {
    radarData = Object.entries(report.topic_scores).map(([k, v]) => ({
      axis: k.replace(/_/g, " "),
      s: Math.min(Math.round((v ?? 0) * 10), 100),
      score: v ?? 0,
      topic: k.replace(/_/g, " "),
    }));
  } else if (matrix && Object.values(matrix).some((v) => Number(v) > 0)) {
    const matrixAxes = [
      ["correctness", "Correctness"],
      ["depth", "Depth"],
      ["communication", "Communication"],
      ["reasoning", "Reasoning"],
      ["clarity", "Clarity"],
      ["role_fit", "Role Fit"],
    ];
    radarData = matrixAxes
      .filter(([key]) => matrix[key] != null)
      .map(([key, label]) => ({
        axis: label,
        s: Math.min(Math.round((matrix[key] ?? 0) * 10), 100),
        score: matrix[key] ?? 0,
        topic: label,
      }));
  }

  const strengths = Array.isArray(report.strengths) ? report.strengths : [];

  const improvements =
    report.improvements ??
    report.weaknesses ??
    report.areas_for_improvement ??
    report.concerns ??
    [];

  let topicEvals = Array.isArray(report.topic_evaluations) ? report.topic_evaluations : [];
  if (topicEvals.length === 0 && report.topic_scores && Object.keys(report.topic_scores).length > 0) {
    topicEvals = Object.entries(report.topic_scores).map(([k, v]) => ({
      topic: k.replace(/_/g, " "),
      score: v,
    }));
  }
  if (topicEvals.length === 0 && radarData.length > 0) {
    topicEvals = radarData;
  }

  const turns = report.evaluated_turns || report.turns || [];
  const recommendationText =
    report.recommendation ||
    (turns.length === 0
      ? "This interview ended before any scored responses were submitted. Start a new session and answer at least one question for a full evaluation."
      : overallScore >= 80
      ? "Excellent performance! You demonstrated strong technical expertise and clear communication."
      : overallScore >= 65
      ? "Good performance. With targeted practice on tradeoffs and edge-cases, you can reach top tier."
      : "Keep practicing — review the improvement areas below to level up your engineering skills.");

  return (
    <AppShell>
      <PageHeader
        title="Interview Report"
        badge={`Session · ${id?.slice(0, 8)}`}
        description={`${role} · ${difficulty} — AI-graded breakdown of your performance with personalized feedback.`}
        actions={
          <Button asChild className="bg-[#FF6500] hover:bg-orange-600 text-white font-semibold">
            <Link to="/">
              Run another <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 px-4 py-6 md:px-8 max-w-7xl mx-auto">
        {/* ── Overall Score Hero ── */}
        <Card className="border-[#262626] bg-[#0A0A0A] p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={120} height={120} viewBox="0 0 120 120">
              <circle cx={60} cy={60} r={52} fill="none" stroke="#1a1a1a" strokeWidth={10} />
              <circle
                cx={60}
                cy={60}
                r={52}
                fill="none"
                stroke={overallScore >= 75 ? "#FF6500" : overallScore >= 55 ? "#eab308" : "#ef4444"}
                strokeWidth={10}
                strokeDasharray={`${(overallScore / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold text-white">{overallScore}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Trophy className="h-5 w-5 text-[#FF6500]" />
              <h2 className="text-lg font-bold text-white">Overall Performance</h2>
            </div>
            <p className="text-sm text-[#A1A1A1] leading-relaxed">
              {recommendationText}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge className="bg-[#FF6500]/10 text-[#FF6500] border-[#FF6500]/20 font-semibold">{role}</Badge>
              <Badge variant="outline" className="border-[#262626] text-zinc-400 capitalize">{difficulty}</Badge>
              <Badge variant="outline" className="border-[#262626] text-zinc-400">
                {report.questions_answered ?? turns.length} {((report.questions_answered ?? turns.length) === 1) ? "question" : "questions"} evaluated
              </Badge>
              {report.status && (
                <Badge variant="outline" className="border-[#262626] text-zinc-400 capitalize">{report.status}</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* ── Score Cards ── */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {scoreCards.map((s) => (
            <ScoreRing key={s.k} value={s.v} label={s.k} />
          ))}
        </div>

        {/* ── Radar + Topic Evals ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {radarData.length > 0 && (
            <Card className="border-[#262626] bg-[#0A0A0A] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-[#FF6500]" />
                <h3 className="text-sm font-semibold text-white">Skill Breakdown</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fontSize: 10, fill: "#e4e4e7", fontWeight: 500 }}
                    />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar
                      dataKey="s"
                      stroke="#FF6500"
                      fill="#FF6500"
                      fillOpacity={0.25}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0A0A0A",
                        border: "1px solid #262626",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {topicEvals.length > 0 && (
            <Card className="border-[#262626] bg-[#0A0A0A] p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-[#FF6500]" />
                <h3 className="text-sm font-semibold text-white">Topic Evaluations</h3>
              </div>
              <div className="space-y-2 overflow-auto max-h-72 pr-1">
                {topicEvals.map((t, i) => (
                  <TopicRow key={i} item={t} />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Strengths + Improvements ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-[#262626] bg-[#0A0A0A] p-5">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Demonstrated Strengths
            </h3>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                    <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{typeof x === "string" ? x : x.text || JSON.stringify(x)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">No specific strengths recorded yet for this session.</p>
            )}
          </Card>

          <Card className="border-[#262626] bg-[#0A0A0A] p-5">
            <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-1.5">
              <X className="h-4 w-4" /> Areas to Improve
            </h3>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                    <X className="mt-0.5 h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span>{typeof x === "string" ? x : x.text || JSON.stringify(x)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">No specific areas to improve were flagged in this session.</p>
            )}
          </Card>
        </div>

        {/* ── Turn-by-Turn Q&A Breakdown ── */}
        {turns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#FF6500]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Turn-by-Turn Question Critiques</h3>
            </div>

            <div className="space-y-2">
              {turns.map((turn, idx) => {
                const ev = turn.evaluation || {};
                const score = ev.score ?? 7;
                const isExpanded = expandedTurns[idx] ?? true;

                return (
                  <Card key={idx} className="border-[#262626] bg-[#0A0A0A] overflow-hidden p-0">
                    <button
                      onClick={() => toggleTurn(idx)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold bg-[#FF6500]/15 text-[#FF6500] border border-[#FF6500]/30 px-2 py-0.5 rounded">
                          Q{idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1">
                          {turn.question || "Interview Question"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-0.5 rounded">
                          {score}/10
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#1F1F1F] space-y-3 text-xs">
                        <div>
                          <span className="font-semibold text-zinc-400 block mb-1">Your Response:</span>
                          <p className="text-zinc-200 bg-black/80 p-3 rounded-lg border border-[#262626] leading-relaxed italic">
                            "{turn.answer || "No response recorded"}"
                          </p>
                        </div>

                        {ev.summary && (
                          <div>
                            <span className="font-semibold text-[#FF6500] block mb-1">Interviewer Feedback:</span>
                            <p className="text-zinc-300 leading-relaxed bg-[#141414]/50 p-2.5 rounded-lg border border-[#262626]">
                              {ev.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
