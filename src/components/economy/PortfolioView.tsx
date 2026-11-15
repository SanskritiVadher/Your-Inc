"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PieChart as PieIcon,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SubjectHolding {
  id: string;
  name: string;
  code: string;
  credits: number;
  sharePrice: number;
  dayChangePercent: number;
  monthChangePercent: number;
  valueAtRisk7d: number;
  sparkline: number[];
  reviewSharePercent: number;
  syllabusWeightPercent: number;
  mismatchFlag?: string | null;
}

interface PortfolioData {
  netWorthIndex: number;
  totalEnterpriseValuation: number;
  holdings: SubjectHolding[];
  mismatches: string[];
}

export const PortfolioView: React.FC = () => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/economy/portfolio")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch portfolio:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-mono text-xs text-text-muted">
        Auditing department balance sheets and capital allocation...
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-body">
        <h3 className="font-heading text-lg text-text">No Subjects Enrolled</h3>
        <p className="text-xs text-text-muted mt-1 font-mono">
          Add course subjects to track syllabus mastery and study progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      {/* Top Banner: Credit-Weighted Net Worth Index & Curriculum Mastery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Worth Index */}
        <div className="md:col-span-2 p-5 bg-surface/95 border-2 border-turmeric/60 rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-turmeric/20 text-turmeric">
                  Credit-Weighted Mastery Index
                </span>
                <span className="text-[11px] font-mono text-text-muted">Degree Benchmark</span>
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="font-heading text-4xl sm:text-5xl text-text">
                  {Math.round(data.netWorthIndex)}%
                </span>
                <span className="text-xs font-mono text-text-muted">
                  / 100% Target
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-text-muted block">Curriculum Mastery Points</span>
              <span className="font-heading text-2xl text-text">
                {Math.round(data.totalEnterpriseValuation)} pts
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/70 flex flex-wrap items-center justify-between text-xs font-mono text-text-muted gap-2">
            <div>
              Formula: Weighted by course credit units across {data.holdings.length} subjects
            </div>
            <div className="flex items-center gap-1.5 text-turmeric">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Accuracy</span>
            </div>
          </div>
        </div>

        {/* Capital Allocation & Mismatch Summary */}
        <div className="p-5 bg-surface/90 border border-border rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-turmeric" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-text">
                Effort vs Credit Match
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {data.mismatches.length === 0 ? (
                <div className="p-2.5 rounded bg-leaf/10 border border-leaf/30 text-xs font-mono text-leaf">
                  Balanced study effort matches course credit weights.
                </div>
              ) : (
                data.mismatches.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-sindoor/10 border border-sindoor/30 text-[11px] font-mono text-text flex items-start gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-sindoor shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] font-mono text-text-muted mt-3 pt-2 border-t border-border/70">
            Allocate more review time to subjects with higher credits to maximize overall mastery.
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-surface/90 border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg text-text">Subject Mastery Breakdown</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg text-text-muted border border-border">
              {data.holdings.length} Active Subjects
            </span>
          </div>
          <span className="text-xs font-mono text-text-muted">
            All mastery based on verified recall accuracy &amp; assignments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-bg/60 text-text-muted">
                <th className="py-3 px-4 font-normal">Subject</th>
                <th className="py-3 px-3 font-normal text-right">Credits</th>
                <th className="py-3 px-3 font-normal text-right">Mastery</th>
                <th className="py-3 px-3 font-normal text-right">24H</th>
                <th className="py-3 px-3 font-normal text-right">30D</th>
                <th className="py-3 px-3 font-normal text-right">Fading Risk (7D)</th>
                <th className="py-3 px-4 font-normal text-center">Trend</th>
                <th className="py-3 px-4 font-normal text-center">Allocation</th>
                <th className="py-3 px-3 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.holdings.map((holding) => {
                const isDayPositive = holding.dayChangePercent >= 0;
                const isMonthPositive = holding.monthChangePercent >= 0;

                return (
                  <tr key={holding.id} className="hover:bg-bg/40 transition-colors">
                    {/* Name & Code */}
                    <td className="py-3.5 px-4 font-body">
                      <div className="font-bold text-text text-sm">{holding.name}</div>
                      <div className="font-mono text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-bg border border-border">
                          {holding.code}
                        </span>
                        {holding.mismatchFlag && (
                          <span className="text-sindoor font-mono text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {holding.mismatchFlag}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Credits */}
                    <td className="py-3.5 px-3 text-right font-mono text-text">
                      {holding.credits} Cr
                    </td>

                    {/* Share Price -> Mastery */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className="font-bold text-sm text-text">
                        {Math.round(holding.sharePrice)}%
                      </span>
                    </td>

                    {/* Day % */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isDayPositive ? "text-leaf" : "text-sindoor"
                        }`}
                      >
                        {isDayPositive ? "+" : ""}
                        {holding.dayChangePercent.toFixed(1)}%
                      </span>
                    </td>

                    {/* 30D % */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isMonthPositive ? "text-leaf" : "text-sindoor"
                        }`}
                      >
                        {isMonthPositive ? "+" : ""}
                        {holding.monthChangePercent.toFixed(1)}%
                      </span>
                    </td>

                    {/* Fading Risk (7D) */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className="text-sindoor">
                        -{Math.round(holding.valueAtRisk7d)}%
                      </span>
                    </td>

                    {/* Sparkline */}
                    <td className="py-3.5 px-4 text-center">
                      <svg className="w-20 h-6 inline-block" viewBox="0 0 80 24">
                        {holding.sparkline.length > 1 ? (
                          <polyline
                            fill="none"
                            stroke={isMonthPositive ? "var(--color-leaf)" : "var(--color-sindoor)"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={holding.sparkline
                              .map((val, idx) => {
                                const x = (idx / (holding.sparkline.length - 1)) * 76 + 2;
                                const min = Math.min(...holding.sparkline);
                                const max = Math.max(...holding.sparkline);
                                const range = max - min || 1;
                                const y = 22 - ((val - min) / range) * 20;
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />
                        ) : (
                          <line x1="2" y1="12" x2="78" y2="12" stroke="currentColor" strokeDasharray="2 2" className="text-border" />
                        )}
                      </svg>
                    </td>

                    {/* Allocation Donut / Bar Comparison */}
                    <td className="py-3.5 px-4">
                      <div className="w-28 mx-auto">
                        <div className="flex justify-between text-[9px] font-mono text-text-muted mb-1">
                          <span>Effort {holding.reviewSharePercent.toFixed(0)}%</span>
                          <span>Credit {holding.syllabusWeightPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg rounded overflow-hidden flex">
                          <div
                            className="bg-turmeric h-full"
                            style={{ width: `${Math.min(100, holding.reviewSharePercent)}%` }}
                            title={`Review Effort: ${holding.reviewSharePercent.toFixed(1)}%`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/departments/${holding.id}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-turmeric hover:text-turmeric/80 hover:underline"
                      >
                        <span>Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
