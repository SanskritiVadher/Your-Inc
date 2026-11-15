"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Calendar,
  Building,
  CheckCircle2,
} from "lucide-react";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { PageTurn } from "@/components/ui/PageTurn";
import { BlindSpotDisplay } from "@/components/review/BlindSpotDisplay";

interface CeoLetter {
  wentWell: string;
  slipping: string;
  oneThingToDo: string;
}

interface ConceptAtRisk {
  name: string;
  subjectCode: string;
  currentValue: number;
  projected7d: number;
}

interface QuarterlyReportData {
  id: string;
  startDate: string;
  endDate: string;
  revenueGained: number;
  depreciationLoss: number;
  netValueChange: number;
  bestDepartment: string;
  worstDepartment: string;
  creditRating: string;
  creditRatingDelta: string;
  conceptsAtRisk: ConceptAtRisk[];
  ceoLetter: CeoLetter;
  createdAt?: string;
}

export const QuarterlyResultsView: React.FC = () => {
  const [report, setReport] = useState<QuarterlyReportData | null>(null);
  const [archive, setArchive] = useState<QuarterlyReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  const fetchReport = (reportId?: string) => {
    setLoading(true);
    fetch("/api/economy/quarterly-results")
      .then((res) => res.json())
      .then((json) => {
        if (json.report) setReport(json.report);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load quarterly report:", err);
        setLoading(false);
      });
  };

  const fetchArchive = () => {
    fetch("/api/economy/quarterly-results?archive=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.reports) setArchive(json.reports);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchReport();
    fetchArchive();
  }, []);

  const handleGenerateFresh = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/economy/quarterly-results", { method: "POST" });
      const json = await res.json();
      if (json.report) {
        setReport(json.report);
        fetchArchive();
      }
    } catch (err) {
      console.error("Failed to generate fresh quarterly results:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-body text-xs text-text-muted">
        Compiling quarterly study summary...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-body">
        <h3 className="font-heading text-lg text-text">No Quarterly Results Available</h3>
        <p className="text-xs text-text-muted mt-1 font-body">
          Complete your first review session to generate a weekly summary.
        </p>
      </div>
    );
  }

  const isNetPositive = report.netValueChange >= 0;

  return (
    <div className="space-y-6 font-body">
      {/* Action Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-turmeric" />
          <h2 className="font-heading text-xl text-text">Weekly Learning Report</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-turmeric/20 text-turmeric font-bold">
            Weekly Progress
          </span>
        </div>

        <div className="flex items-center gap-2">
          {archive.length > 1 && (
            <select
              aria-label="Select Archived Weekly Report"
              onChange={(e) => {
                const found = archive.find((a) => a.id === e.target.value);
                if (found) setReport(found);
              }}
              value={report.id}
              className="px-2.5 py-1.5 text-xs font-mono border border-border bg-surface text-text rounded"
            >
              {archive.map((a, i) => (
                <option key={a.id} value={a.id}>
                  Report #{archive.length - i} ({new Date(a.endDate).toLocaleDateString("en-IN")})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleGenerateFresh}
            disabled={generating}
            className="px-3 py-1.5 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-turmeric ${generating ? "animate-spin" : ""}`} />
            <span>{generating ? "Updating..." : "Update Now"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded bg-turmeric hover:bg-turmeric/90 text-bg font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report PDF</span>
          </button>
        </div>
      </div>

      <PageHeaderBand />

      {/* Screen View: Realistic Page-Flip Ledger */}
      <div className="print:hidden">
        <PageTurn
          pages={[
            /* SHEET 1: Overview, Balances & Subject Performance */
            <div key="sheet1" className="space-y-6">
              {/* Ledger Header */}
              <div className="border-b-2 border-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-body text-xs text-turmeric font-semibold">
                      Weekly Study Summary
                    </span>
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl text-text font-bold">
                    Weekly Learning Statement
                  </h1>
                  <p className="font-mono text-xs text-text-muted mt-0.5">
                    Period: {new Date(report.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} —{" "}
                    {new Date(report.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-text-muted block">Deadline Record</span>
                  <span className="font-heading text-2xl font-bold text-leaf">
                    {["AAA", "AA", "A"].includes(report.creditRating)
                      ? "On track"
                      : ["BBB", "BB"].includes(report.creditRating)
                      ? "Slipping"
                      : "Behind"}
                  </span>
                  <span className="text-[10px] text-text-muted block">
                    Tier: {report.creditRating} {report.creditRatingDelta ? `(${report.creditRatingDelta})` : ""}
                  </span>
                </div>
              </div>

              {/* Learning Delta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-bg border border-border">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span>Strength Gained</span>
                    <TrendingUp className="w-4 h-4 text-leaf" />
                  </div>
                  <div className="font-heading text-2xl text-leaf font-bold mt-2">
                    +{Math.round(report.revenueGained)} pts
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mt-1">
                    Recall strength built through active repetition.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-bg border border-border">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span>Memory Faded</span>
                    <TrendingDown className="w-4 h-4 text-sindoor" />
                  </div>
                  <div className="font-heading text-2xl text-sindoor font-bold mt-2">
                    -{Math.round(report.depreciationLoss)} pts
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mt-1">
                    Retention lost to natural forgetting.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-bg border-2 border-turmeric/60">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span>Net Mastery Change</span>
                    <Award className="w-4 h-4 text-turmeric" />
                  </div>
                  <div
                    className={`font-heading text-2xl font-bold mt-2 ${
                      isNetPositive ? "text-leaf" : "text-sindoor"
                    }`}
                  >
                    {isNetPositive ? "+" : ""}
                    {Math.round(report.netValueChange)} pts
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mt-1">
                    Net balance across all subjects.
                  </p>
                </div>
              </div>

              {/* Department Extremes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-leaf/10 border border-leaf/30 flex items-center justify-between">
                  <div>
                    <span className="text-leaf uppercase font-bold text-[10px] block">Strongest Subject</span>
                    <span className="font-heading text-base text-text font-bold">{report.bestDepartment}</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-sindoor/10 border border-sindoor/30 flex items-center justify-between">
                  <div>
                    <span className="text-sindoor uppercase font-bold text-[10px] block">Needs Review</span>
                    <span className="font-heading text-base text-text font-bold">{report.worstDepartment}</span>
                  </div>
                </div>
              </div>
            </div>,

            /* SHEET 2: Weekly 3-Points & Risk Watchlist */
            <div key="sheet2" className="space-y-5">
              <div className="border-b-2 border-border pb-3 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-turmeric font-bold">
                  Sheet 2 · Action Plan & Vulnerabilities
                </span>
                <span className="text-xs font-mono text-text-muted">
                  Outcomes over presence
                </span>
              </div>

              <div className="p-4 rounded-lg bg-bg border-2 border-border/80 space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-turmeric">
                    Your Week in 3 Points
                  </span>
                </div>

                <div className="space-y-3 text-sm font-body text-text">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-leaf/20 text-leaf text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-xs font-mono uppercase text-leaf block">What Went Well:</strong>
                      <p className="text-text mt-0.5 leading-relaxed">{report.ceoLetter.wentWell}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sindoor/20 text-sindoor text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-xs font-mono uppercase text-sindoor block">What Is Slipping:</strong>
                      <p className="text-text mt-0.5 leading-relaxed">{report.ceoLetter.slipping}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-turmeric/20 text-turmeric text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-xs font-mono uppercase text-turmeric block">One Thing to Do This Week:</strong>
                      <p className="text-text mt-0.5 leading-relaxed font-semibold">{report.ceoLetter.oneThingToDo}</p>
                    </div>
                  </div>
                </div>
              </div>

              {report.conceptsAtRisk.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-sindoor">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Topics Fading Next Week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {report.conceptsAtRisk.map((c, i) => (
                      <div key={i} className="p-2.5 rounded bg-bg border border-border text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>{c.subjectCode}</span>
                          <span className="text-sindoor font-bold">
                            {(c.currentValue - c.projected7d).toFixed(0)}% decay
                          </span>
                        </div>
                        <div className="font-heading text-sm text-text font-bold truncate">{c.name}</div>
                        <div className="flex justify-between text-[11px] pt-1">
                          <span className="text-text">Now: {c.currentValue.toFixed(0)}%</span>
                          <span className="text-sindoor">→ {c.projected7d.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blind Spots Self-Check */}
              <div className="pt-2">
                <BlindSpotDisplay />
              </div>

              <div className="pt-3 border-t border-border/80 text-[10px] font-mono text-text-muted flex justify-between">
                <span>Weekly Report · {report.id}</span>
                <span>Outcomes over presence</span>
              </div>
            </div>,
          ]}
          onPageChange={() => {}}
          pageLabel="Report Page"
          showCover={false}
          showControls={true}
          isBookMode={false}
        />
      </div>

      {/* Print-Only Layout (Both Sheets Combined) */}
      <div className="hidden print:block p-8 bg-surface space-y-6">
        <div className="border-b-2 border-border pb-4">
          <h1 className="font-heading text-4xl text-text font-bold">Weekly Learning Statement</h1>
          <p className="font-mono text-xs text-text-muted mt-1">
            Period: {new Date(report.startDate).toLocaleDateString()} — {new Date(report.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded">Strength Gained: +{Math.round(report.revenueGained)} pts</div>
          <div className="p-4 border rounded">Memory Faded: -{Math.round(report.depreciationLoss)} pts</div>
          <div className="p-4 border rounded">Net Mastery Change: {Math.round(report.netValueChange)} pts</div>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-bold mb-2">Your Week in 3 Points</h2>
          <p>1. {report.ceoLetter.wentWell}</p>
          <p>2. {report.ceoLetter.slipping}</p>
          <p>3. {report.ceoLetter.oneThingToDo}</p>
        </div>
      </div>
    </div>
  );
};
