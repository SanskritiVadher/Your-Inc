"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Bookmark,
  Share2,
  Layers,
} from "lucide-react";
import { KatexFormula } from "@/components/ui/KatexFormula";
import { RevisionSheetData, FrameworkItem, KeyPointItem, FormulaSummaryItem } from "@/lib/revision/revisionSheetService";

interface RevisionSheetViewProps {
  sheet: RevisionSheetData;
  subjectId: string;
}

export function RevisionSheetView({ sheet, subjectId }: RevisionSheetViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border/80 bg-surface">
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold text-leaf uppercase tracking-wider font-body">
            1-Page Study Summary
          </span>
          <h2 className="font-heading text-xl text-text font-normal">
            Session Revision Sheet
          </h2>
          <p className="text-xs text-text-muted font-body">
            Grounded strictly in lecture slides and your personal notes. Formatted for high-contrast B&W A4 printing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-border bg-bg text-text text-xs font-body hover:bg-surface transition-colors"
          >
            <Printer size={14} className="text-text-muted" />
            <span>Print Sheet</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-cobalt text-white text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shadow-2xs"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>

          {/* Combine all sessions link */}
          <Link
            href={`/departments/${subjectId}/revision-sheets`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-border/80 bg-surface hover:bg-border/30 text-text text-xs font-body transition-colors"
          >
            <Layers size={14} className="text-cobalt" />
            <span>Combine all sessions of this subject</span>
          </Link>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="flex justify-center">
        <div className="revision-sheet-a4 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-8 bg-paper border border-border/80 rounded shadow-xs print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full font-body text-text">
          
          {/* 1. Header: Session title, Subject, Date */}
          <header className="border-b-2 border-text/80 pb-3 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-medium mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-border/40 text-text text-[10px] font-medium">
                    {sheet.termName}
                  </span>
                  <span>•</span>
                  <span>{sheet.subjectCode} · {sheet.subjectName}</span>
                  {sheet.sessionNumber && (
                    <>
                      <span>•</span>
                      <span>Session {sheet.sessionNumber}</span>
                    </>
                  )}
                </div>
                <h1 className="font-heading text-2xl text-text font-normal leading-tight">
                  {sheet.deckTitle}
                </h1>
              </div>

              <div className="text-right text-[11px] text-text-muted shrink-0">
                <div>{new Date(sheet.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</div>
                <div className="text-[10px] text-text-muted/70 print:block">A4 One-Page Revision</div>
              </div>
            </div>
          </header>

          {/* 2. The Big Idea (1 sentence) */}
          <section className="mb-4 p-2.5 rounded bg-surface/70 border-l-4 border-cobalt print:bg-transparent print:border-text">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cobalt print:text-black block mb-0.5">
              The Big Idea
            </span>
            <p className="text-sm font-medium text-text italic leading-snug">
              &ldquo;{sheet.bigIdea}&rdquo;
            </p>
          </section>

          {/* Two-Column Grid for Middle Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 3. 5 Key Points with Slide Numbers & Memory Hooks */}
            <section className="p-3 rounded border border-border/70 bg-surface/40 print:bg-transparent print:border-text/60">
              <h2 className="font-heading text-sm text-text font-normal mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                <span>Key Session Points</span>
                <span className="text-[10px] text-text-muted font-body font-normal">(Slide referenced)</span>
              </h2>
              <ol className="space-y-2 text-xs">
                {sheet.keyPoints.map((item, idx) => (
                  <li key={idx} className="space-y-0.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-text-muted text-[11px] shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <span className="text-text font-medium leading-tight">
                          {item.point}
                        </span>
                        <span className="ml-1.5 px-1 py-0.2 rounded bg-border/40 text-text-muted text-[10px] font-mono whitespace-nowrap">
                          p.{item.slideNumber}
                        </span>
                      </div>
                    </div>
                    {item.memoryHook && (
                      <div className="pl-4 text-[11px] text-leaf print:text-black italic leading-tight">
                        💡 {item.memoryHook}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* 4. Frameworks Drawn as Simple Diagrams */}
            <section className="p-3 rounded border border-border/70 bg-surface/40 print:bg-transparent print:border-text/60">
              <h2 className="font-heading text-sm text-text font-normal mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                <span>Visual Framework</span>
                <span className="text-[10px] text-text-muted font-body font-normal">(Decision Model)</span>
              </h2>
              <div className="space-y-3">
                {sheet.frameworks.map((fw, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="text-xs font-semibold text-text">
                      {fw.name}
                    </div>

                    {/* 2x2 Matrix Diagram */}
                    {fw.type === "2x2" && (
                      <div className="grid grid-cols-2 gap-1 p-1.5 rounded bg-surface border border-border/70 text-center text-[10px] print:border-text">
                        {fw.labels.slice(0, 4).map((lbl, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-1.5 rounded bg-bg border border-border/50 print:bg-transparent print:border-black font-medium leading-tight"
                          >
                            {lbl}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Flow Diagram */}
                    {fw.type === "flow" && (
                      <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-surface border border-border/70 text-[10px] print:border-text overflow-x-auto">
                        {fw.labels.map((step, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <div className="flex-1 p-1 rounded bg-bg border border-border/50 print:bg-transparent print:border-black text-center font-medium leading-tight min-w-[50px]">
                              {step}
                            </div>
                            {sIdx < fw.labels.length - 1 && (
                              <ArrowRight size={10} className="text-text-muted shrink-0 print:text-black" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* Pyramid Diagram */}
                    {fw.type === "pyramid" && (
                      <div className="space-y-1 p-1.5 rounded bg-surface border border-border/70 text-[10px] print:border-text">
                        {fw.labels.map((tier, tIdx) => {
                          const widthPct = 40 + tIdx * 30; // 40%, 70%, 100%
                          return (
                            <div
                              key={tIdx}
                              style={{ width: `${Math.min(widthPct, 100)}%` }}
                              className="mx-auto p-1 rounded bg-bg border border-border/50 print:bg-transparent print:border-black text-center font-medium leading-tight"
                            >
                              {tier}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[11px] text-text-muted leading-tight">
                      {fw.summary}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 5. Formulas with One-Line Meaning */}
          {sheet.formulas.length > 0 && (
            <section className="mb-4 p-3 rounded border border-border/70 bg-surface/40 print:bg-transparent print:border-text/60">
              <h2 className="font-heading text-sm text-text font-normal mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                <span>Key Formulas</span>
                <span className="text-[10px] text-text-muted font-body font-normal">(Equations & Application)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sheet.formulas.map((f, idx) => (
                  <div key={idx} className="p-2 rounded bg-surface border border-border/50 print:bg-transparent print:border-black/50 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-text">
                      <span>{f.name}</span>
                      {f.slideNumber && (
                        <span className="text-[10px] font-mono text-text-muted">p.{f.slideNumber}</span>
                      )}
                    </div>
                    <div className="py-0.5 text-center font-mono text-xs overflow-x-auto">
                      <KatexFormula math={f.formula} block={false} />
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug">
                      <span className="font-medium text-text">Use when:</span> {f.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Likely Exam Questions & Student Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3 Likely Exam Questions */}
            <section className="p-3 rounded border border-border/70 bg-surface/40 print:bg-transparent print:border-text/60">
              <h2 className="font-heading text-sm text-text font-normal mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                <span>Likely Exam Questions</span>
                <span className="text-[10px] text-text-muted font-body font-normal">(Targeted Prep)</span>
              </h2>
              <ul className="space-y-2 text-xs">
                {sheet.examQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold text-cobalt print:text-black shrink-0">Q{idx + 1}:</span>
                    <span className="text-text leading-tight">{q}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Student's Own Notes (Kalam font) */}
            <section className="p-3 rounded border border-border/70 bg-surface/40 print:bg-transparent print:border-text/60">
              <h2 className="font-heading text-sm text-text font-normal mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                <span>Your Notes & Faculty Insights</span>
                <span className="text-[10px] text-text-muted font-body font-normal">(Personal handwriting)</span>
              </h2>
              <div className="font-handwriting text-sm text-text/90 leading-relaxed whitespace-pre-wrap p-2 rounded bg-paper/60 border border-border/40 print:bg-transparent print:border-black/30">
                {sheet.studentNotes}
              </div>
            </section>
          </div>

          {/* Footer note */}
          <footer className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-text-muted">
            <span>Prepared from lecture slides & personal study notes • Antigravity LMS</span>
            <span>Single-Page A4 Sheet</span>
          </footer>

        </div>
      </div>
    </div>
  );
}
