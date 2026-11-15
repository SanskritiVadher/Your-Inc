"use client";

import React, { useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  BookOpen,
  Award,
} from "lucide-react";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { useToast } from "@/components/ui/Toast";

interface AnswerGraderProps {
  subjects?: { id: string; name: string; code: string }[];
}

export const AnswerGraderView: React.FC<AnswerGraderProps> = ({ subjects = [] }) => {
  const { error: toastError, success } = useToast();

  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [grading, setGrading] = useState(false);

  // Results
  const [result, setResult] = useState<{
    score: number;
    gradeLetter: string;
    strengths: string[];
    fixes: string[];
    modelOutline: string[];
    evaluationComponentsConsidered: string[];
    professorPreferencesApplied: string[];
  } | null>(null);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !studentAnswer.trim() || grading) return;

    setGrading(true);
    try {
      const res = await fetch("/api/boardroom/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId || null,
          question,
          studentAnswer,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grade answer");

      setResult(data);
      success("Answer checked against course syllabus and guidelines.");
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
    } finally {
      setGrading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setStudentAnswer(text);
      success(`Loaded file: ${file.name}`);
    } else {
      toastError("Please paste text directly or upload a .txt/.md file.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative p-6 sm:p-8 rounded-lg border-2 border-border bg-surface shadow-md font-body">
        <LedgerBorder stroke="#7A3B24" className="opacity-15" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-sindoor font-semibold">
                Syllabus & Guide Check
              </span>
              <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
                Executive Answer Grader
              </h2>
              <p className="text-xs text-text-muted font-body">
                Evaluates written case solutions and exam answers against your department&apos;s evaluation weights, professor preferences, and slide concepts.
              </p>
            </div>

            {subjects.length > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-text-muted">Target Department:</span>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="p-1.5 rounded bg-bg border border-border text-text font-mono focus:outline-none focus:border-sindoor"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleGrade} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-mono text-xs uppercase tracking-wider text-text-muted">
                Exam / Case Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Paste the exam prompt, case discussion dilemma, or interview scenario here..."
                rows={2}
                className="w-full p-3 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-xs uppercase tracking-wider text-text-muted">
                  Your Written Answer
                </label>
                <label className="inline-flex items-center gap-1 font-mono text-[11px] text-sindoor hover:underline cursor-pointer">
                  <Upload size={12} />
                  <span>Upload .txt / .md</span>
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Paste your drafted solution, analytical calculations, or strategic recommendations here..."
                rows={6}
                className="w-full p-3.5 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!question.trim() || !studentAnswer.trim() || grading}
                className="px-6 py-2.5 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm"
              >
                <Sparkles size={13} />
                <span>{grading ? "Checking your answer..." : "Check Answer Against Syllabus"}</span>
              </button>
            </div>
          </form>

          {/* Evaluation Results */}
          {result && (
            <div className="space-y-5 pt-4 border-t border-border animate-in fade-in duration-300">
              <OrnamentDivider stroke="#7A3B24" className="opacity-30" />

              {/* Score Header */}
              <div className="p-4 rounded border border-border bg-surface flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider">
                    Syllabus Audit Result
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="font-mono text-4xl font-bold text-sindoor">
                      {result.score}/100
                    </span>
                    <span className="font-mono text-lg font-bold px-2.5 py-0.5 rounded bg-turmeric/15 text-turmeric border border-turmeric/30">
                      Grade {result.gradeLetter}
                    </span>
                  </div>
                </div>

                {result.evaluationComponentsConsidered.length > 0 && (
                  <div className="text-right text-xs font-mono text-text-muted">
                    <span className="block text-[10px] uppercase">Weighted Against:</span>
                    <span>{result.evaluationComponentsConsidered.join(" • ")}</span>
                  </div>
                )}
              </div>

              {/* 3 Strengths & 3 Fixes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3 Strengths */}
                <div className="p-4 rounded border border-leaf/30 bg-leaf/5 space-y-2.5">
                  <span className="font-mono text-xs font-bold uppercase text-leaf flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>3 Key Strengths</span>
                  </span>
                  <ul className="space-y-2 text-xs text-text font-body leading-relaxed">
                    {result.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-leaf font-bold shrink-0">{idx + 1}.</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3 Fixes */}
                <div className="p-4 rounded border border-sindoor/30 bg-sindoor/5 space-y-2.5">
                  <span className="font-mono text-xs font-bold uppercase text-sindoor flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>3 Actionable Fixes</span>
                  </span>
                  <ul className="space-y-2 text-xs text-text font-body leading-relaxed">
                    {result.fixes.map((fix, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-sindoor font-bold shrink-0">{idx + 1}.</span>
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rewritten Model Outline (Outline only, not full essay) */}
              <div className="p-4 rounded border border-border bg-surface space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-turmeric flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>Rewritten Model Outline (Executive Architecture)</span>
                </span>
                <p className="text-[11px] font-mono text-text-muted">
                  Use this structural scaffolding to organize your thoughts during exams without copying text verbatim:
                </p>
                <div className="p-3 rounded bg-bg border border-border space-y-1.5 font-mono text-xs text-text">
                  {result.modelOutline.map((line, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
