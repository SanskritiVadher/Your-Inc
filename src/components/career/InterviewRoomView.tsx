"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Clock,
  Award,
  Sparkles,
  AlertTriangle,
  History,
  CheckCircle2,
  Play,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TranscriptMessage {
  speaker: "interviewer" | "student";
  message: string;
  timestamp?: string;
}

interface ScorecardData {
  structureScore: number;
  depthScore: number;
  commScore: number;
  businessScore: number;
  overallScore: number;
  feedback: string;
  fixes: string[];
  targetedWeaknessLogged?: string;
}

interface MockInterviewSummary {
  id: string;
  mode: string;
  roleTargeted: string;
  performanceScore: number;
  completed: boolean;
  createdAt: string;
  feedback?: string | null;
}

interface InterviewRoomViewProps {
  onScorecardCompleted: () => void;
}

export function InterviewRoomView({ onScorecardCompleted }: InterviewRoomViewProps) {
  // Modes: PM, CONSULTING, MARKETING, BEHAVIOURAL
  const [selectedMode, setSelectedMode] = useState<"PM" | "CONSULTING" | "MARKETING" | "BEHAVIOURAL">("PM");
  const [roleInput, setRoleInput] = useState("Product Manager");
  const [companyInput, setCompanyInput] = useState("Tier-1 Technology / Consulting");

  // Active interview session states
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Student answer input
  const [studentAnswer, setStudentAnswer] = useState("");
  const [sendingTurn, setSendingTurn] = useState(false);

  // Voice Speech-To-Text (Web Speech API)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Timer states (optional timed mode)
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes default
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Final evaluation scorecard
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // History & trends
  const [history, setHistory] = useState<MockInterviewSummary[]>([]);
  const [modeTrends, setModeTrends] = useState<Record<string, { count: number; averageScore: number }>>({});
  const [viewTab, setViewTab] = useState<"room" | "history">("room");

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/career/interviews");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.interviews || []);
        setModeTrends(json.modeTrends || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role");
      const companyParam = params.get("company");
      if (roleParam) setRoleInput(roleParam);
      if (companyParam) setCompanyInput(companyParam);
    }
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Web Speech API initialization
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your response.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setStudentAnswer((prev) => prev + " " + event.results[i][0].transcript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleStartInterview = async () => {
    try {
      setStarting(true);
      setScorecard(null);
      setTranscript([]);
      const res = await fetch("/api/career/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          mode: selectedMode,
          roleTargeted: roleInput,
          companyTargeted: companyInput,
        }),
      });

      if (!res.ok) throw new Error("Failed to start mock interview");
      const data = await res.json();
      setActiveInterviewId(data.interview.id);
      setTranscript([
        {
          speaker: "interviewer",
          message: data.interview.question,
          timestamp: new Date().toISOString(),
        },
      ]);
      setContextNote(data.contextNote);
      setTimerSeconds(180);
      setIsTimerRunning(true);
    } catch (err) {
      alert("Something went wrong. Try again.");
    } finally {
      setStarting(false);
    }
  };

  const handleSendTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterviewId || !studentAnswer.trim()) return;

    try {
      setSendingTurn(true);
      if (isRecording) toggleRecording();

      const res = await fetch("/api/career/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "turn",
          interviewId: activeInterviewId,
          studentAnswer: studentAnswer.trim(),
          currentTranscript: transcript,
        }),
      });

      if (!res.ok) throw new Error("Failed to send answer");
      const data = await res.json();
      setTranscript(data.transcript);
      setStudentAnswer("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting answer");
    } finally {
      setSendingTurn(false);
    }
  };

  const handleWrapUpAndEvaluate = async () => {
    if (!activeInterviewId || transcript.length < 2) {
      alert("Provide at least one answer before concluding the interview.");
      return;
    }

    try {
      setEvaluating(true);
      setIsTimerRunning(false);
      const res = await fetch("/api/career/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          interviewId: activeInterviewId,
          transcript,
        }),
      });

      if (!res.ok) throw new Error("Failed to evaluate interview");
      const data: ScorecardData = await res.json();
      setScorecard(data);
      await fetchHistory();
      onScorecardCompleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error evaluating interview");
    } finally {
      setEvaluating(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const studentAnswersCount = transcript.filter((t) => t.speaker === "student").length;

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Live Simulation Room
            </span>
            <span className="font-body text-xs text-text-muted">Pushback & Follow-ups</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Executive Mock Interview Room
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Real McKinsey & Google case formats with proactive AI pushback. Questions target your weak
            memories and logged projects.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex border border-border">
            <button
              onClick={() => setViewTab("room")}
              className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                viewTab === "room"
                  ? "bg-leaf text-white font-bold"
                  : "bg-paper text-text hover:bg-paper-sunken"
              }`}
            >
              Interview Room
            </button>
            <button
              onClick={() => setViewTab("history")}
              className={`px-3 py-1.5 font-mono text-xs transition-colors border-l border-border ${
                viewTab === "history"
                  ? "bg-leaf text-white font-bold"
                  : "bg-paper text-text hover:bg-paper-sunken"
              }`}
            >
              Score Trends ({history.length})
            </button>
          </div>
        </div>
      </div>

      {viewTab === "room" ? (
        <div className="space-y-6">
          {/* Mode Selector & Setup (if no drill active) */}
          {!activeInterviewId || scorecard ? (
            <div className="border border-border bg-paper p-6 space-y-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                  Configure Interview Practice
                </span>
                <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                  Select Mock Mode & Focus
                </h3>
              </div>

              {/* 4 Interview Modes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    mode: "PM",
                    title: "Product Manager",
                    desc: "Product design, metrics, guesstimates, MVP scoping.",
                  },
                  {
                    mode: "CONSULTING",
                    title: "Management Case",
                    desc: "MECE structuring, market entry, profit decline.",
                  },
                  {
                    mode: "MARKETING",
                    title: "Brand & GTM",
                    desc: "Positioning, customer discovery, campaign launch.",
                  },
                  {
                    mode: "BEHAVIOURAL",
                    title: "Behavioural (STAR)",
                    desc: "Conflict resolution, leadership, failure analysis.",
                  },
                ].map((item) => {
                  const isSelected = selectedMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setSelectedMode(item.mode as any)}
                      className={`p-4 border text-left transition-all ${
                        isSelected
                          ? "border-leaf bg-leaf/10 shadow-xs"
                          : "border-border bg-paper hover:bg-paper-sunken"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-text">{item.title}</span>
                        {isSelected && <span className="text-leaf">●</span>}
                      </div>
                      <p className="text-xs text-text-muted font-body mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Optional Custom Target Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1">
                    Role Targeted
                  </label>
                  <input
                    type="text"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1">
                    Target Company
                  </label>
                  <input
                    type="text"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="primary"
                  size="md"
                  disabled={starting}
                  onClick={handleStartInterview}
                  className="font-mono text-xs flex items-center gap-2 px-5"
                >
                  <Play size={14} />
                  {starting ? "Preparing question..." : "Start Practice Session"}
                </Button>
              </div>
            </div>
          ) : null}

          {/* ACTIVE DRILL CONVERSATION ROOM */}
          {activeInterviewId && !scorecard && (
            <div className="border border-border bg-paper p-6 space-y-4">
              {/* Interview Top Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] uppercase font-bold">
                    {selectedMode} PRACTICE ACTIVE
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    Turn {studentAnswersCount + 1} of 3
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 font-mono text-xs bg-paper-sunken px-2.5 py-1 border border-border">
                    <Clock size={13} className={timerSeconds < 30 ? "text-terracotta" : "text-leaf"} />
                    <span className={timerSeconds < 30 ? "text-terracotta font-bold" : "text-text font-bold"}>
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWrapUpAndEvaluate}
                    disabled={evaluating || studentAnswersCount === 0}
                    className="font-mono text-xs text-leaf border-leaf/40 hover:bg-leaf/10"
                  >
                    {evaluating ? "Evaluating..." : "Conclude & Score"}
                  </Button>
                </div>
              </div>

              {contextNote && (
                <div className="text-[11px] font-mono text-leaf bg-leaf/5 p-2 border border-leaf/20 flex items-center gap-1.5">
                  <Sparkles size={12} /> {contextNote}
                </div>
              )}

              {/* Live Transcript Bubble Scroll */}
              <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-paper-sunken border border-border">
                {transcript.map((msg, idx) => {
                  const isInterviewer = msg.speaker === "interviewer";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isInterviewer ? "items-start" : "items-end"}`}
                    >
                      <span className="font-mono text-[10px] uppercase text-text-muted mb-0.5">
                        {isInterviewer ? "AI Partner / Interviewer" : "You (Candidate)"}
                      </span>
                      <div
                        className={`max-w-xl p-3.5 text-xs font-body leading-relaxed ${
                          isInterviewer
                            ? "bg-paper border border-border text-text"
                            : "bg-leaf/10 border border-leaf/30 text-text"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student Response Textarea & Mic Input */}
              <form onSubmit={handleSendTurn} className="space-y-3 pt-2">
                <div className="relative">
                  <textarea
                    required
                    rows={4}
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Structure your executive response. (e.g., 'I would frame this across 3 pillars: Supply Constraints, Price Elasticity, and Regulatory Moats...')"
                    className="w-full bg-paper border border-border p-3 font-body text-xs text-text focus:outline-none focus:border-leaf leading-relaxed"
                  />

                  {/* Speech to text toggle button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`absolute bottom-3 right-3 p-2 border transition-colors ${
                      isRecording
                        ? "bg-terracotta text-white border-transparent animate-pulse"
                        : "bg-paper text-text-muted hover:text-text border-border"
                    }`}
                    title={isRecording ? "Stop voice recording" : "Voice answer (speech to text)"}
                  >
                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-text-muted">
                    {isRecording
                      ? "Listening via microphone... speak clearly."
                      : "Voice or text input supported."}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={sendingTurn || !studentAnswer.trim()}
                      className="font-mono text-xs flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      {sendingTurn ? "Interviewer Thinking..." : "Deliver Response"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* FINAL SCORECARD CARD */}
          {scorecard && (
            <div className="border border-leaf/40 bg-leaf/5 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-leaf/20 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-leaf/10 border border-leaf/30 text-leaf shrink-0">
                    <Award size={24} />
                  </div>
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-leaf font-bold">
                      EXECUTIVE INTERVIEW SCORECARD
                    </span>
                    <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
                      Performance Rating: {scorecard.overallScore.toFixed(1)}/100
                    </h3>
                    <p className="text-xs text-text font-body mt-1 leading-relaxed">
                      {scorecard.feedback}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setScorecard(null);
                    setActiveInterviewId(null);
                  }}
                  className="font-mono text-xs"
                >
                  Start Next Mock
                </Button>
              </div>

              {/* 4 Pillars Grid (1 to 5) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Structure", score: scorecard.structureScore },
                  { label: "Depth", score: scorecard.depthScore },
                  { label: "Communication", score: scorecard.commScore },
                  { label: "Business Sense", score: scorecard.businessScore },
                ].map((pillar) => (
                  <div key={pillar.label} className="bg-paper p-3 border border-border font-mono text-xs">
                    <span className="text-[10px] uppercase text-text-muted block">{pillar.label}</span>
                    <div className="font-bold text-text text-lg mt-0.5">
                      {pillar.score.toFixed(1)} <span className="text-xs font-normal text-text-muted">/ 5.0</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3 Specific Actionable Fixes */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-text-muted block">
                  3 High-Priority Executive Fixes
                </span>
                <div className="space-y-2">
                  {scorecard.fixes.map((fix, idx) => (
                    <div
                      key={idx}
                      className="bg-paper p-3 border border-border text-xs font-body text-text flex items-start gap-2.5"
                    >
                      <span className="font-mono font-bold text-leaf shrink-0 mt-0.5">0{idx + 1}.</span>
                      <p className="leading-relaxed">{fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weak Area Memory Logging Notice */}
              {scorecard.targetedWeaknessLogged && (
                <div className="p-3 bg-paper-sunken border border-border text-xs font-mono text-text-muted flex items-center justify-between">
                  <span>
                    Logged to Long-Term Memory: <strong className="text-text">{scorecard.targetedWeaknessLogged}</strong>
                  </span>
                  <span className="text-[10px] text-leaf font-bold">
                    Targeted in your 4th Practice Session
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* HISTORY & SCORE TRENDS VIEW */
        <div className="space-y-6">
          {/* Mode Score Trends Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            {Object.entries(modeTrends).map(([mName, stat]) => (
              <div key={mName} className="border border-border bg-paper p-4">
                <span className="text-[10px] uppercase text-text-muted block">{mName} Practice</span>
                <div className="text-xl font-bold text-text mt-1">
                  {stat.count > 0 ? `${stat.averageScore.toFixed(1)}/100` : "—"}
                </div>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {stat.count} session{stat.count === 1 ? "" : "s"} completed
                </span>
              </div>
            ))}
          </div>

          {/* Historical List */}
          <div className="border border-border bg-paper p-5 space-y-4">
            <h4 className="font-heading text-lg font-medium text-text">Past Practice Sessions</h4>
            {history.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-text-muted border border-dashed border-border bg-paper-sunken">
                No past mock interviews completed yet. Start your first practice session above.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((h) => (
                  <div key={h.id} className="py-3 flex items-start justify-between text-xs font-mono">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-paper-sunken border border-border text-[10px] font-bold">
                          {h.mode}
                        </span>
                        <span className="font-medium text-text">{h.roleTargeted}</span>
                      </div>
                      <span className="text-[10px] text-text-muted mt-0.5 block">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-leaf text-sm">
                        {h.performanceScore.toFixed(1)}/100
                      </span>
                      <span className="text-[10px] text-text-muted block">
                        {h.completed ? "Completed" : "Incomplete"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
