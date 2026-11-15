"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  Search,
  Filter,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  BookOpen,
  X,
} from "lucide-react";
import { KatexFormula } from "@/components/ui/KatexFormula";

interface VariableMeaning {
  symbol: string;
  meaning: string;
}

interface FormulaItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  termName?: string;
  deckId?: string | null;
  deckTitle?: string | null;
  slideNumber?: number | null;
  name: string;
  category: string;
  formulaLatex: string;
  variableMeanings: VariableMeaning[];
  whenToUse: string;
  isUnclear: boolean;
  unclearNote?: string | null;
  calculationKey: string;
  exampleParams: Record<string, number>;
  workedSteps: string[];
  workedAnswer: number;
}

interface SemesterOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  termId?: string | null;
}

interface FormulaSheetViewProps {
  semesters?: SemesterOption[];
  subjects?: SubjectOption[];
}

export function FormulaSheetView({
  semesters = [],
  subjects = [],
}: FormulaSheetViewProps) {
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unclear">("all");

  // Practice Modal State
  const [practiceFormula, setPracticeFormula] = useState<FormulaItem | null>(null);
  const [practicePrompt, setPracticePrompt] = useState("");
  const [practiceParams, setPracticeParams] = useState<Record<string, number> | null>(null);
  const [practiceUnits, setPracticeUnits] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceResult, setPracticeResult] = useState<{
    isCorrect: boolean;
    correctAnswer: number;
    difference: number;
    steps: string[];
  } | null>(null);

  // Load formulas from API
  const fetchFormulas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.set("subjectId", selectedSubject);
      if (selectedSemester) params.set("semesterId", selectedSemester);
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (activeTab === "unclear") params.set("unclearOnly", "true");

      const res = await fetch(`/api/formulas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFormulas(data.formulas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulas();
  }, [selectedSemester, selectedSubject, selectedCategory, searchQuery, activeTab]);

  const categories = ["All", "Finance", "Economics", "Marketing"];

  // Open Practice session with newly generated numbers
  const handleOpenPractice = async (f: FormulaItem) => {
    setPracticeFormula(f);
    setUserAnswer("");
    setPracticeResult(null);
    setPracticeLoading(true);
    try {
      const res = await fetch("/api/formulas/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          formulaKey: f.calculationKey,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPracticePrompt(data.prompt);
        setPracticeParams(data.params);
        setPracticeUnits(data.units || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPracticeLoading(false);
    }
  };

  // Submit answer for code evaluation
  const handleSubmitPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceFormula || !practiceParams || !userAnswer.trim()) return;

    setPracticeLoading(true);
    try {
      const res = await fetch("/api/formulas/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          formulaKey: practiceFormula.calculationKey,
          params: practiceParams,
          userAnswer: parseFloat(userAnswer),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPracticeResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPracticeLoading(false);
    }
  };

  const unclearCount = formulas.filter((f) => f.isUnclear).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border border-border bg-surface p-6 rounded-md space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-semibold text-cobalt uppercase tracking-wider">
                Course Reference
              </span>
              <span className="text-xs font-body text-text-muted">Grounded In Class Slides</span>
            </div>
            <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
              Formula Sheet
            </h2>
            <p className="font-body text-xs text-text-muted mt-0.5">
              Every formula from your finance, economics, and marketing lecture decks. Worked examples calculated in code.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-surface text-xs font-body text-text hover:bg-bg transition-colors"
            >
              <Printer size={14} className="text-cobalt" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Tab switchers: All vs Check these */}
        <div className="flex items-center gap-3 border-b border-border/40 pb-2 text-xs font-body">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-1 font-medium transition-colors ${
              activeTab === "all"
                ? "border-b-2 border-cobalt text-cobalt font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            All Formulas
          </button>
          <button
            onClick={() => setActiveTab("unclear")}
            className={`pb-1 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "unclear"
                ? "border-b-2 border-turmeric text-turmeric-dark font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            <AlertTriangle size={13} className="text-turmeric" />
            <span>Check these</span>
            {unclearCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-turmeric/20 text-turmeric-dark text-[10px]">
                {unclearCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-body">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by formula name or application..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
            >
              <option value="">All Semesters</option>
              {semesters.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-body transition-colors ${
                selectedCategory === cat
                  ? "bg-cobalt text-white dark:text-[#1A1714] font-medium"
                  : "bg-bg border border-border text-text-muted hover:text-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Print Document Title Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="font-heading text-3xl font-bold">Comprehensive Course Formula Sheet</h1>
        <p className="font-body text-xs text-neutral-600 mt-1">
          Self-study reference compiled from class lecture slides · Calculations verified
        </p>
      </div>

      {/* Formula Cards Grid */}
      {loading ? (
        <div className="p-12 text-center rounded-md border border-border bg-surface font-body text-xs text-text-muted">
          Loading course formulas...
        </div>
      ) : formulas.length === 0 ? (
        <div className="p-12 text-center rounded-md border border-dashed border-border bg-surface font-body text-xs text-text-muted space-y-2">
          <Calculator size={32} className="mx-auto text-text-muted opacity-50" />
          <p className="font-heading text-base text-text">No formulas found</p>
          <p className="max-w-md mx-auto">
            {activeTab === "unclear"
              ? "All slide formulas have clear variable definitions. No items need instructor verification."
              : "Upload a lecture deck with financial models or economics to automatically populate your formula sheet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formulas.map((f) => (
            <div
              key={f.id}
              className={`rounded-md border p-5 bg-surface space-y-4 transition-all shadow-xs print:shadow-none print:border-neutral-300 print:break-inside-avoid ${
                f.isUnclear
                  ? "border-turmeric/50 bg-turmeric/5"
                  : "border-border hover:border-cobalt/40"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cobalt/10 text-cobalt font-body text-[10px] font-semibold">
                      {f.category}
                    </span>
                    <span className="font-body text-xs text-text-muted">
                      {f.subjectCode} · {f.termName || "Course"}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg text-text font-normal mt-1">
                    {f.name}
                  </h3>
                </div>

                {f.deckTitle && (
                  <Link
                    href={`/decks/${f.deckId}${f.slideNumber ? `?slide=${f.slideNumber}` : ""}`}
                    className="font-body text-[11px] text-cobalt hover:underline flex items-center gap-1 shrink-0 print:hidden"
                    title={`View in ${f.deckTitle}`}
                  >
                    <BookOpen size={12} />
                    <span>Slide {f.slideNumber || "1"}</span>
                  </Link>
                )}
              </div>

              {/* KaTeX Math Expression Box */}
              <div className="p-3.5 rounded bg-paper-sunken border border-border/80 text-center font-serif text-base text-text overflow-x-auto">
                <KatexFormula math={f.formulaLatex} block />
              </div>

              {/* Unclear Warning Banner if flagged */}
              {f.isUnclear && (
                <div className="p-2.5 rounded bg-turmeric/15 border border-turmeric/30 text-xs font-body text-turmeric-dark space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle size={13} />
                    <span>Check with instructor</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {f.unclearNote || "Slide formula notation requires clarification before exam use."}
                  </p>
                </div>
              )}

              {/* Variable Meanings */}
              <div className="space-y-1 text-xs font-body">
                <span className="text-xs font-semibold text-text-muted block">
                  Variables
                </span>
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  {f.variableMeanings.map((v, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-cobalt font-medium shrink-0">
                        {v.symbol}:
                      </span>
                      <span className="text-text-muted">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* When to Use */}
              <div className="space-y-1 text-xs font-body">
                <span className="text-xs font-semibold text-text-muted block">
                  When to use
                </span>
                <p className="text-text leading-relaxed text-[11px]">
                  {f.whenToUse}
                </p>
              </div>

              {/* Worked Example (Calculated In Code) */}
              <div className="p-3 rounded bg-bg/80 border border-border/60 space-y-2 text-xs font-body">
                <div className="flex items-center justify-between">
                  <span className="font-body text-xs font-medium text-text">
                    Example
                  </span>
                  <span className="font-body text-[10px] text-text-muted">
                    Calculated in code
                  </span>
                </div>
                <div className="space-y-1 text-[11px] font-mono text-text-muted">
                  {f.workedSteps.map((step, idx) => (
                    <div key={idx} className="leading-snug">
                      • {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action: Practice Button */}
              {!f.isUnclear && (
                <div className="pt-2 flex justify-end print:hidden">
                  <button
                    onClick={() => handleOpenPractice(f)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cobalt text-white dark:text-[#1A1714] text-xs font-body font-medium hover:bg-cobalt/90 transition-all shadow-xs"
                  >
                    <Sparkles size={13} />
                    <span>Practice (New Numbers)</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Practice Interactive Modal */}
      {practiceFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-lg p-6 space-y-5 shadow-xl font-body text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <span className="font-body text-xs font-semibold text-cobalt">
                  Practice Drill
                </span>
                <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                  {practiceFormula.name}
                </h3>
              </div>
              <button
                onClick={() => setPracticeFormula(null)}
                className="text-text-muted hover:text-text p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* KaTeX formula preview */}
            <div className="p-3 rounded bg-paper-sunken border border-border/60 text-center">
              <KatexFormula math={practiceFormula.formulaLatex} block />
            </div>

            {/* Generated Question Prompt */}
            <div className="p-4 rounded bg-bg border border-border space-y-2">
              <span className="text-xs font-semibold text-text-muted block">
                Scenario and inputs
              </span>
              <p className="text-sm font-body text-text leading-relaxed">
                {practicePrompt || "Generating simple values..."}
              </p>
            </div>

            {/* Answer Input Form */}
            {!practiceResult ? (
              <form onSubmit={handleSubmitPractice} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Your Calculated Answer {practiceUnits ? `(${practiceUnits})` : ""}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Enter number..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full p-2.5 rounded border border-border bg-bg text-text text-sm font-mono focus:outline-none focus:border-cobalt"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={practiceLoading || !userAnswer.trim()}
                      className="px-5 py-2.5 rounded bg-cobalt text-white dark:text-[#1A1714] text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {practiceLoading ? "Checking..." : "Check Answer"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Verified Result Breakdown */
              <div className="space-y-4">
                <div
                  className={`p-4 rounded border text-xs font-body space-y-2 ${
                    practiceResult.isCorrect
                      ? "bg-leaf/10 border-leaf/40 text-leaf"
                      : "bg-turmeric/15 border-turmeric/40 text-text"
                  }`}
                >
                  <div className="flex items-center gap-2 font-heading text-base font-normal">
                    {practiceResult.isCorrect ? (
                      <>
                        <CheckCircle2 size={18} className="text-leaf" />
                        <span>Spot on! Accurate calculation</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-turmeric-dark" />
                        <span>Close try. Let&apos;s review the steps</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    Your Answer: <strong className="font-mono text-text">{userAnswer}</strong> · Exact Answer:{" "}
                    <strong className="font-mono text-text">{practiceResult.correctAnswer} {practiceUnits}</strong>
                  </p>
                </div>

                {/* Step by Step Resolution IN CODE */}
                <div className="p-3.5 rounded bg-bg border border-border space-y-2">
                  <span className="text-xs font-semibold text-text-muted block">
                    Step-by-step arithmetic:
                  </span>
                  <div className="space-y-1 text-xs font-mono text-text-muted">
                    {practiceResult.steps.map((st, i) => (
                      <div key={i} className="leading-relaxed">
                        {i + 1}. {st}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <button
                    onClick={() => handleOpenPractice(practiceFormula)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] text-xs font-body font-medium hover:bg-cobalt/90 transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Try Another Set</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
