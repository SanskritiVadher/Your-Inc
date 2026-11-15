"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  AlertTriangle,
  Award,
  Building,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { useToast } from "@/components/ui/Toast";

interface ColdCallData {
  available: boolean;
  conceptId?: string;
  conceptName?: string;
  conceptValue?: number;
  subjectName?: string;
  subjectCode?: string;
  company?: string;
  scenario?: string;
  question?: string;
  message?: string;
}

export const ColdCallSimulator: React.FC = () => {
  const { success, error: toastError, info } = useToast();

  const [coldCall, setColdCall] = useState<ColdCallData | null>(null);
  const [loading, setLoading] = useState(true);

  // Turn state: 1 = initial answer, 2 = answering AI pushback, "completed" = final score
  const [turn, setTurn] = useState<number | "completed">(1);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [pushbackQuestion, setPushbackQuestion] = useState<string | null>(null);
  const [secondAnswer, setSecondAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  // Results
  const [evaluationResult, setEvaluationResult] = useState<{
    scores: { structure: number; insight: number; evidence: number; overall: number };
    improvementLine: string;
    valueDelta: number;
    oldValue: number;
    newValue: number;
    weakConceptMemoryCreated: boolean;
  } | null>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const fetchColdCall = async () => {
    setLoading(true);
    setTurn(1);
    setStudentAnswer("");
    setPushbackQuestion(null);
    setSecondAnswer("");
    setEvaluationResult(null);

    try {
      const res = await fetch("/api/boardroom/cold-call");
      const data = await res.json();
      setColdCall(data);
    } catch {
      toastError("Failed to load Cold Call scenario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColdCall();
  }, []);

  // Browser speech recognition support
  const toggleSpeechRecognition = (isTurn2 = false) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toastError("Speech recognition is not supported in this browser. Please type your response.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (isTurn2) {
          setSecondAnswer((prev) => `${prev} ${transcript}`.trim());
        } else {
          setStudentAnswer((prev) => `${prev} ${transcript}`.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      toastError("Could not initialize voice microphone.");
      setIsListening(false);
    }
  };

  // Submit Turn 1 (Initial Answer)
  const handleSubmitTurn1 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentAnswer.trim() || evaluating || !coldCall?.conceptId) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setEvaluating(true);
    try {
      const res = await fetch("/api/boardroom/cold-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: coldCall.conceptId,
          answer: studentAnswer,
          turn: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit answer");

      if (data.needsPushback) {
        setPushbackQuestion(data.pushback);
        setTurn(2);
      } else {
        setEvaluationResult(data);
        setTurn("completed");
      }
    } catch (err: unknown) {
      toastError((err as Error).message || "Cold call submission failed");
    } finally {
      setEvaluating(false);
    }
  };

  // Submit Turn 2 (Response to AI Pushback)
  const handleSubmitTurn2 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!secondAnswer.trim() || evaluating || !coldCall?.conceptId) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setEvaluating(true);
    try {
      const combined = `${studentAnswer}\n\n[Professor Challenge]: ${pushbackQuestion}\n[Student Defense]: ${secondAnswer}`;
      const res = await fetch("/api/boardroom/cold-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: coldCall.conceptId,
          answer: combined,
          turn: 2,
          previousPushback: pushbackQuestion,
          isFinal: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize evaluation");

      setEvaluationResult(data);
      setTurn("completed");
      success("Practice drill complete and progress saved.");
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-lg border border-border bg-surface font-body space-y-3">
        <Loader2 size={32} className="mx-auto text-cobalt animate-spin" />
        <h3 className="font-heading text-lg text-text">Preparing Practice Question...</h3>
        <p className="text-xs text-text-muted font-mono">
          Selecting key concepts and setting up case context.
        </p>
      </div>
    );
  }

  if (!coldCall?.available) {
    return (
      <div className="p-8 text-center rounded-lg border border-dashed border-border bg-surface space-y-2">
        <AlertTriangle size={32} className="mx-auto text-turmeric opacity-60" />
        <h3 className="font-heading text-lg text-text">No Concepts Ready for Practice</h3>
        <p className="text-xs text-text-muted font-body">
          {coldCall?.message || "Upload a slide deck to start practicing case questions."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cold Call Scenario Surface */}
      <div className="relative p-6 sm:p-8 rounded-lg border-2 border-sindoor/40 bg-surface shadow-md">
        <LedgerBorder stroke="#B3261E" className="opacity-15" />

        <div className="relative z-10 space-y-6">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-turmeric/10 text-turmeric border border-turmeric/20">
                {coldCall.subjectCode}
              </span>
              <span className="font-heading text-sm text-text font-medium">
                {coldCall.subjectName}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
              <span>Target Asset: <strong>{coldCall.conceptName}</strong></span>
              <span>•</span>
              <span>Current Mastery: ₹{(coldCall.conceptValue || 0).toFixed(1)}</span>
            </div>
          </div>

          {/* Scenario Case Prompt */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-sindoor uppercase tracking-wider font-bold">
              <Building size={12} />
              <span>Executive Case Challenge</span>
            </div>
            <div className="font-heading text-xl sm:text-2xl text-text font-normal leading-relaxed">
              {coldCall.question}
            </div>
          </div>

          {/* TURN 1: Initial Answer */}
          {turn === 1 && (
            <form onSubmit={handleSubmitTurn1} className="space-y-3 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>Deliver your executive answer (Type or Speak)</span>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition(false)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    isListening
                      ? "bg-sindoor text-white animate-pulse"
                      : "bg-surface border border-border text-text hover:border-sindoor"
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                  <span>{isListening ? "Listening..." : "Voice Dictate"}</span>
                </button>
              </div>

              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="State your strategic diagnosis, quantitative rationale, and operational recommendations..."
                rows={4}
                className="w-full p-3.5 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!studentAnswer.trim() || evaluating}
                  className="px-5 py-2.5 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
                >
                  <Send size={13} />
                  <span>{evaluating ? "Evaluating Stance..." : "Submit Executive Answer"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TURN 2: Professor Pushback Challenge */}
          {turn === 2 && (
            <div className="space-y-4 pt-3 border-t border-border animate-in fade-in duration-300">
              {/* Previous Student Answer Snapshot */}
              <div className="p-3 rounded bg-bg/60 border border-border/80 text-xs text-text-muted font-body">
                <span className="font-mono text-[10px] uppercase text-text font-semibold block mb-1">
                  Your Initial Position:
                </span>
                <p className="line-clamp-2">{studentAnswer}</p>
              </div>

              {/* Pushback Banner */}
              <div className="p-4 rounded border-2 border-turmeric/60 bg-turmeric/10 space-y-2">
                <div className="flex items-center gap-2 text-turmeric font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle size={15} />
                  <span>Professor Raghavan Pushes Back:</span>
                </div>
                <p className="font-heading text-lg text-text leading-relaxed">
                  &ldquo;{pushbackQuestion}&rdquo;
                </p>
              </div>

              {/* Turn 2 Defense Input */}
              <form onSubmit={handleSubmitTurn2} className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>Defend your thesis with specific evidence or execution metrics:</span>
                  <button
                    type="button"
                    onClick={() => toggleSpeechRecognition(true)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      isListening
                        ? "bg-sindoor text-white animate-pulse"
                        : "bg-surface border border-border text-text hover:border-sindoor"
                    }`}
                  >
                    {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                    <span>{isListening ? "Listening..." : "Voice Dictate"}</span>
                  </button>
                </div>

                <textarea
                  value={secondAnswer}
                  onChange={(e) => setSecondAnswer(e.target.value)}
                  placeholder="Address the challenge directly: provide numerical benchmarks, operational milestones, or defensive mitigations..."
                  rows={4}
                  className="w-full p-3.5 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={!secondAnswer.trim() || evaluating}
                    className="px-5 py-2.5 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
                  >
                    <Send size={13} />
                    <span>{evaluating ? "Checking your answer..." : "Submit Answer"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TURN COMPLETED: Final Scoring & Balance Sheet Impact */}
          {turn === "completed" && evaluationResult && (
            <div className="space-y-5 pt-3 border-t border-border animate-in fade-in duration-300">
              <OrnamentDivider stroke="#B3261E" className="opacity-30" />

              <div className="space-y-2 text-center">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-leaf">
                  Practice Drill Evaluated
                </span>
                <h3 className="font-heading text-2xl text-text">
                  Performance Breakdown
                </h3>
              </div>

              {/* 3 Rubric Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-body">
                <div className="p-3 rounded border border-border bg-bg/50">
                  <span className="font-mono text-[10px] uppercase text-text-muted">Structure</span>
                  <div className="font-mono text-2xl font-bold text-text mt-0.5">
                    {evaluationResult.scores.structure}/5
                  </div>
                </div>

                <div className="p-3 rounded border border-border bg-bg/50">
                  <span className="font-mono text-[10px] uppercase text-text-muted">Insight</span>
                  <div className="font-mono text-2xl font-bold text-text mt-0.5">
                    {evaluationResult.scores.insight}/5
                  </div>
                </div>

                <div className="p-3 rounded border border-border bg-bg/50">
                  <span className="font-mono text-[10px] uppercase text-text-muted">Evidence</span>
                  <div className="font-mono text-2xl font-bold text-text mt-0.5">
                    {evaluationResult.scores.evidence}/5
                  </div>
                </div>

                <div className="p-3 rounded border border-border bg-bg/50">
                  <span className="font-mono text-[10px] uppercase text-text-muted">Score Change</span>
                  <div
                    className={`font-mono text-2xl font-bold mt-0.5 flex items-center gap-1 ${
                      evaluationResult.valueDelta >= 0 ? "text-leaf" : "text-sindoor"
                    }`}
                  >
                    {evaluationResult.valueDelta >= 0 ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                    <span>
                      {evaluationResult.valueDelta >= 0
                        ? `+₹${evaluationResult.valueDelta.toFixed(1)}`
                        : `-₹${Math.abs(evaluationResult.valueDelta).toFixed(1)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sharp Improvement Line */}
              <div className="p-4 rounded border border-border bg-surface text-xs font-body space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-sindoor font-bold block">
                  Advisor Critique
                </span>
                <p className="text-text text-sm leading-relaxed">{evaluationResult.improvementLine}</p>
              </div>

              {/* Weak Concept Memory Flag */}
              {evaluationResult.weakConceptMemoryCreated && (
                <div className="p-3 rounded bg-turmeric/10 border border-turmeric/30 text-xs font-mono text-turmeric flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>
                    Score &le; 3.0: Automatically logged a <strong>weak_concept</strong> memory entry into your episodic knowledge vault.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={fetchColdCall}
                  className="px-5 py-2.5 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw size={14} />
                  <span>Draw Next Case Cold Call</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
