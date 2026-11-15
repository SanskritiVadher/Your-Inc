"use client";

import React from "react";
import Link from "next/link";
import { Printer, Download, ArrowLeft, BookOpen, Layers } from "lucide-react";
import { RevisionSheetData } from "@/lib/revision/revisionSheetService";
import { RevisionSheetView } from "@/components/decks/RevisionSheetView";

interface CombinedRevisionSheetsClientProps {
  subject: {
    id: string;
    name: string;
    code: string;
    termName: string;
  };
  sheets: RevisionSheetData[];
}

export function CombinedRevisionSheetsClient({
  subject,
  sheets,
}: CombinedRevisionSheetsClientProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border/80 bg-surface">
        <div className="flex items-center gap-3">
          <Link
            href={`/departments/${subject.id}`}
            className="p-2 rounded border border-border/60 hover:bg-bg transition-colors text-text-muted hover:text-text"
            title="Back to subject"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <span className="text-[11px] font-semibold text-leaf uppercase tracking-wider font-body">
              {subject.code} · All Sessions Combined
            </span>
            <h1 className="font-heading text-xl text-text font-normal">
              Course Revision Compendium
            </h1>
            <p className="text-xs text-text-muted font-body">
              {sheets.length} session revision sheets with Table of Contents. Formatted for high-contrast B&W A4 printing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-border bg-bg text-text text-xs font-body hover:bg-surface transition-colors"
          >
            <Printer size={14} className="text-text-muted" />
            <span>Print All</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-cobalt text-white text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shadow-2xs"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Contents Page (Table of Contents) */}
      <div className="flex justify-center">
        <div className="w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 bg-paper border border-border/80 rounded shadow-xs print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full font-body text-text">
          <div className="border-b-2 border-text/80 pb-4 mb-6">
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">
              {subject.termName} • Course Overview
            </span>
            <h1 className="font-heading text-3xl text-text font-normal mt-1">
              {subject.name} ({subject.code})
            </h1>
            <p className="text-xs text-text-muted font-body mt-1">
              Table of Contents • {sheets.length} Sessions
            </p>
          </div>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-text/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="py-2 pr-4 w-16">Session</th>
                <th className="py-2 px-4">Session Title</th>
                <th className="py-2 px-4 w-28">Date</th>
                <th className="py-2 pl-4 text-right w-16">Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sheets.map((s, idx) => (
                <tr key={s.deckId} className="hover:bg-surface/50">
                  <td className="py-2.5 pr-4 font-mono font-medium text-cobalt print:text-black">
                    {s.sessionNumber ? `S${s.sessionNumber}` : `—`}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-text">
                    {s.deckTitle}
                  </td>
                  <td className="py-2.5 px-4 text-text-muted text-[11px]">
                    {new Date(s.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono text-text-muted print:text-black">
                    p.{idx + 2}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t border-border/60 text-[11px] text-text-muted">
            <p>Each following page provides a complete 1-page revision sheet extracted directly from the session slides and personal notes.</p>
          </div>
        </div>
      </div>

      {/* 2. Each Session's Revision Sheet (with A4 page break before each) */}
      {sheets.map((sheet, index) => (
        <div key={sheet.deckId} className="print:break-before-page pt-4 print:pt-0">
          <div className="print:hidden flex items-center justify-between max-w-[210mm] mx-auto mb-2 px-1 text-xs text-text-muted">
            <span>Session {sheet.sessionNumber || index + 1} of {sheets.length}</span>
            <span className="font-mono">Page {index + 2}</span>
          </div>
          <RevisionSheetView sheet={sheet} subjectId={subject.id} />
        </div>
      ))}
    </div>
  );
}
