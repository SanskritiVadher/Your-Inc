"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Play,
  FileCheck,
  Send,
} from "lucide-react";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";

interface ExamPlanDay {
  dayNumber: number;
  date: string;
  formattedDate: string;
  focus: string;
  targetCards: number;
  coldCallFocus?: string | null;
  isMockPaperScheduled?: boolean;
  isEveOfExam?: boolean;
  isExamDay?: boolean;
  completed?: boolean;
}

interface ExamPlanItem {
  id: string;
  examDate: string;
  status: string;
  daysPlan: ExamPlanDay[];
  subject: {
    id: string;
    name: string;
    code: string;
    evaluationComponents?: { name: string; weight: number }[];
  };
}

interface ExamModeViewProps {
  subjects?: { id: string; name: string; code: string }[];
  decks?: { id: string; title: string; subjectId: string }[];
}

export const ExamModeView: React.FC<ExamModeViewProps> = ({
  subjects = [],
  decks = [],
}) => {
  const { success, error: toastError, info } = useToast();

  const [plans, setPlans] = useState<ExamPlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "");
  const [examDate, setExamDate] = useState("");
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Active Plan & Mock Paper Runner State
  const [activePlan, setActivePlan] = useState<ExamPlanItem | null>(null);
  const [isMockExamOpen, setIsMockExamOpen] = useState(false);
  const [mockQuestions, setMockQuestions] = useState<
    { id: string; text: string; type: string; answer?: string }[]
  >([]);
  const [mockTimeRemaining, setMockTimeRemaining] = useState(1800); // 30 minutes in seconds
  const [mockTimerRunning, setMockTimerRunning] = useState(false);
  const [gradingMock, setGradingMock] = useState(false);
  const [mockFeedback, setMockFeedback] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/boardroom/exam-plan");
      const data = await res.json();
      setPlans(data.plans || []);
      if (data.plans?.length > 0) {
        setActivePlan(data.plans[0]);
      }
    } catch {
      toastError("Something went wrong. Try again.");
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Timer countdown for Mock Exam
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mockTimerRunning && mockTimeRemaining > 0) {
      interval = setInterval(() => {
        setMockTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (mockTimeRemaining <= 0) {
      setMockTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [mockTimerRunning, mockTimeRemaining]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !examDate || generating) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/boardroom/exam-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          examDate,
          scopeDeckIds: selectedDeckIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate exam plan");

      success("Adaptive day-by-day exam plan capitalized on balance sheet.");
      setPlans((prev) => [data.plan, ...prev]);
      setActivePlan(data.plan);

      if (data.mockQuestionsAvailable) {
        setMockQuestions(
          data.mockQuestionsAvailable.map((q: any) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            answer: "",
          }))
        );
      }
    } catch (err: unknown) {
      toastError((err as Error).message || "Exam plan generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleStartMockExam = () => {
    if (mockQuestions.length === 0) {
      // Seed default questions if none retrieved from scoped decks
      setMockQuestions([
        {
          id: "q1",
          text: "Analyze the capital structure implications of substituting subordinated debt for mezzanine equity in an acquisition.",
          type: "EXAM",
          answer: "",
        },
        {
          id: "q2",
          text: "How does working capital velocity impact cash conversion cycles under supply chain disruptions?",
          type: "CASE",
          answer: "",
        },
        {
          id: "q3",
          text: "Explain the tradeoff between operating leverage and financial risk when entering a new geographic market.",
          type: "INTERVIEW",
          answer: "",
        },
      ]);
    }
    setMockTimeRemaining(1800);
    setMockTimerRunning(true);
    setMockFeedback(null);
    setIsMockExamOpen(true);
  };

  const handleSubmitMockExam = async () => {
    setGradingMock(true);
    try {
      const combinedAnswers = mockQuestions
        .map((q, idx) => `Q${idx + 1}: ${q.text}\nAnswer: ${q.answer || "No response provided."}`)
        .join("\n\n");

      const res = await fetch("/api/boardroom/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activePlan?.subject.id,
          question: "Full Timed Mock Examination Paper",
          studentAnswer: combinedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed");

      setMockTimerRunning(false);
      setMockFeedback(
        `Mock Exam Graded! Overall Score: ${data.score}/100 (Grade ${data.gradeLetter}). Strengths: ${data.strengths[0]} Fix: ${data.fixes[0]}`
      );
      success("Mock exam evaluated and progress saved.");
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
    } finally {
      setGradingMock(false);
    }
  };

  const availableDecks = selectedSubjectId
    ? decks.filter((d) => d.subjectId === selectedSubjectId)
    : decks;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 font-body">
      {/* Create New Plan Card */}
      <div className="p-6 rounded-lg border-2 border-border bg-surface shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-sindoor font-semibold">
              High-Stakes Preparation Engine
            </span>
            <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
              Exam Mode & Timed Mock Simulator
            </h2>
            <p className="text-xs text-text-muted">
              Generates an adaptive schedule weighted by (100 - mastery) &times; syllabus weight, scheduling a timed mock paper exactly 2 days before exam day.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subject */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] uppercase text-text-muted">
              Target Department
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedDeckIds([]);
              }}
              className="w-full p-2.5 rounded bg-bg border border-border text-xs font-mono text-text focus:outline-none focus:border-sindoor"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Date */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] uppercase text-text-muted">
              Scheduled Exam Date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full p-2.5 rounded bg-bg border border-border text-xs font-mono text-text focus:outline-none focus:border-sindoor"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!examDate || generating}
              className="w-full py-2.5 px-4 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles size={13} />
              <span>{generating ? "Calculating Schedule..." : "Capitalize Exam Plan"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Exam Plan Display */}
      {activePlan && (
        <div className="p-6 rounded-lg border border-border bg-surface shadow-md space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="font-mono text-xs font-bold text-turmeric uppercase">
                Active Operational Roadmap
              </span>
              <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
                {activePlan.subject.code}: {activePlan.subject.name}
              </h3>
              <p className="font-mono text-xs text-text-muted">
                Exam Scheduled:{" "}
                {new Date(activePlan.examDate).toLocaleDateString("en-IN", {
                  dateStyle: "full",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartMockExam}
                className="px-4 py-2 rounded bg-turmeric text-black font-mono text-xs font-bold hover:bg-turmeric/90 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Play size={13} fill="currentColor" />
                <span>Launch Mock Exam Paper</span>
              </button>
            </div>
          </div>

          {/* Day-by-Day Schedule Timeline */}
          <div className="space-y-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted block">
              Day-by-Day Reinvestment Schedule
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activePlan.daysPlan.map((day) => {
                const isMockDay = day.isMockPaperScheduled;
                const isExam = day.isExamDay;

                return (
                  <div
                    key={day.dayNumber}
                    className={`p-3.5 rounded border text-xs flex flex-col justify-between gap-2.5 transition-all ${
                      isExam
                        ? "border-sindoor/60 bg-sindoor/10 shadow-sm"
                        : isMockDay
                        ? "border-turmeric/60 bg-turmeric/10 shadow-sm"
                        : "border-border bg-bg/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold text-text">Day {day.dayNumber}</span>
                        <span className="text-text-muted">{day.formattedDate}</span>
                      </div>

                      <p className="font-heading text-sm text-text font-medium leading-snug">
                        {day.focus}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-1 font-mono text-[10px] text-text-muted">
                      {day.targetCards > 0 && (
                        <div className="flex items-center justify-between text-text">
                          <span>Review Target:</span>
                          <span className="font-bold">{day.targetCards} Cards</span>
                        </div>
                      )}

                      {day.coldCallFocus && (
                        <div className="text-[10px] text-sindoor font-semibold truncate">
                          Cold Call: {day.coldCallFocus}
                        </div>
                      )}

                      {isMockDay && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-turmeric/30 text-turmeric font-bold text-[9px] uppercase">
                          Full Mock Paper
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timed Mock Paper Modal Dialog */}
      <Dialog
        isOpen={isMockExamOpen}
        onClose={() => setIsMockExamOpen(false)}
        title="Timed Examination Simulation"
        size="xl"
      >
        <div className="space-y-5 font-body">
          {/* Timer Banner */}
          <div className="p-3.5 rounded bg-surface border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-sindoor" />
              <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Exam Time Remaining:
              </span>
              <span className="font-mono text-lg font-bold text-sindoor">
                {formatTimer(mockTimeRemaining)}
              </span>
            </div>

            <span className="font-mono text-[10px] text-text-muted">
              Auto-graded via Syllabus Answer Grader
            </span>
          </div>

          {mockFeedback && (
            <div className="p-3.5 rounded bg-leaf/10 border border-leaf/30 text-leaf text-xs font-mono font-medium">
              {mockFeedback}
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {mockQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded border border-border bg-bg/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-sindoor">Question {idx + 1} ({q.type})</span>
                </div>
                <p className="font-heading text-sm text-text font-normal">{q.text}</p>
                <textarea
                  value={q.answer || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMockQuestions((prev) =>
                      prev.map((item) => (item.id === q.id ? { ...item, answer: val } : item))
                    );
                  }}
                  placeholder="Type your response under examination constraints..."
                  rows={3}
                  className="w-full p-2.5 rounded bg-surface border border-border text-xs text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed font-body"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border flex justify-end gap-2">
            <button
              onClick={() => setIsMockExamOpen(false)}
              className="px-4 py-2 rounded border border-border font-mono text-xs text-text hover:bg-surface"
            >
              Exit Simulation
            </button>

            <button
              onClick={handleSubmitMockExam}
              disabled={gradingMock}
              className="px-5 py-2 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Send size={12} />
              <span>{gradingMock ? "Checking Answers..." : "Submit Mock Paper"}</span>
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
