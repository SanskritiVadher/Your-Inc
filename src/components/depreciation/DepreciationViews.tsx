"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { LedgerCard } from "@/components/ui/LedgerCard";
import { ExplainableNumberModal } from "@/components/ledger/ExplainableNumberModal";
import { AlertTriangle, TrendingDown, ArrowRight, ShieldAlert, Sparkles, History, HelpCircle } from "lucide-react";

export interface AtRiskConcept {
  id: string;
  name: string;
  currentValue: number;
  projectedValue7d: number;
  valueLoss: number;
  daysUntilSub50: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  cardCount: number;
}

interface DepreciationViewsProps {
  subjectId?: string;
  onSelectConceptToReview?: (conceptId: string) => void;
}

export const ValueAtRiskTile: React.FC<{ subjectId?: string }> = ({ subjectId }) => {
  const [data, setData] = useState<{
    totalValueAtRiskThisWeek: number;
    atRiskConcepts: AtRiskConcept[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = subjectId ? `?subjectId=${subjectId}` : "";
    fetch(`/api/depreciation${q}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="p-4 rounded border border-border bg-surface animate-pulse flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-32 bg-border rounded" />
          <div className="h-6 w-20 bg-border rounded" />
        </div>
      </div>
    );
  }

  const riskAmount = data?.totalValueAtRiskThisWeek || 0;
  const count = data?.atRiskConcepts?.length || 0;

  return (
    <div className="p-4 rounded border border-sindoor/30 bg-surface relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded bg-sindoor/10 text-sindoor border border-sindoor/20">
          <TrendingDown size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sindoor font-bold">
              Memory Fading
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sindoor/10 text-sindoor">
              Next 7 Days
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-2xl font-bold text-text">
              -{Math.round(riskAmount)} pts
            </span>
            <span className="text-xs text-text-muted font-body">
              retention fading across {count} topics
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sindoor text-white text-xs font-mono font-semibold hover:bg-sindoor-dark transition-colors shadow-sm"
        >
          <span>Practice Now (Review Due)</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

export const DepreciationRiskList: React.FC<{
  subjectId?: string;
  limit?: number;
  onAuditConcept?: (concept: { id: string; name: string; value: number }) => void;
}> = ({ subjectId, limit = 5, onAuditConcept }) => {
  const [concepts, setConcepts] = useState<AtRiskConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<{ id: string; name: string; value: number } | null>(null);

  useEffect(() => {
    const q = subjectId ? `?subjectId=${subjectId}` : "";
    fetch(`/api/depreciation${q}`)
      .then((res) => res.json())
      .then((json) => {
        setConcepts(json.atRiskConcepts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-mono text-text-muted animate-pulse">
        Analyzing memory retention curves...
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded bg-surface/50">
        <ShieldAlert size={28} className="mx-auto text-leaf mb-2 opacity-60" />
        <p className="font-heading text-sm text-text">All Topics Fresh &amp; Strong</p>
        <p className="font-body text-xs text-text-muted mt-1">
          All course topics maintain recall strength above 50% for the coming week.
        </p>
      </div>
    );
  }

  const displayList = concepts.slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1">
        <span>Topics Fading Soon (&lt; 50% Recall)</span>
        <span>{concepts.length} Due for Review</span>
      </div>

      <div className="space-y-2">
        {displayList.map((item) => {
          // Graceful color loss: desaturates from vibrant turmeric (100%) to muted warm stone (50% and below), never a red alarm
          const saturationFactor = Math.max(0.3, Math.min(1, item.currentValue / 100));

          return (
            <div
              key={item.id}
              className="p-3 rounded border border-border bg-surface hover:border-border/80 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-turmeric/10 text-turmeric border border-turmeric/20 font-semibold">
                    {item.subjectCode}
                  </span>
                  <span className="font-heading font-semibold text-text text-sm">{item.name}</span>
                  {item.daysUntilSub50 <= 3 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                      Fading in &lt; {item.daysUntilSub50}d
                    </span>
                  )}
                </div>

                {/* Gentle color-loss fading bar (desaturates slowly rather than a red alarm) */}
                <div className="flex items-center gap-3 text-text-muted font-body">
                  <div className="w-24 sm:w-32 h-1.5 rounded-full bg-border/50 overflow-hidden" title="Gentle retention decay">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(10, Math.min(100, item.currentValue))}%`,
                        backgroundColor: `hsl(38, ${Math.round(saturationFactor * 65)}%, ${Math.round(50 + (1 - saturationFactor) * 15)}%)`,
                      }}
                    />
                  </div>

                  <span>
                    Recall:{" "}
                    <button
                      onClick={() => {
                        if (onAuditConcept) {
                          onAuditConcept({ id: item.id, name: item.name, value: item.currentValue });
                        } else {
                          setSelectedAudit({ id: item.id, name: item.name, value: item.currentValue });
                        }
                      }}
                      className="font-mono font-semibold text-text underline decoration-dotted hover:text-turmeric"
                      title="Calculation breakdown"
                    >
                      {Math.round(item.currentValue)}%
                    </button>
                  </span>
                  <span>→</span>
                  <span>
                    In 7 days:{" "}
                    <span className="font-mono text-text-muted font-medium">
                      {Math.round(item.projectedValue7d)}%
                    </span>
                  </span>
                  <span className="text-[11px] text-text-muted/70">
                    (-{Math.round(item.valueLoss)}% fading)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Link
                  href={`/review?mode=weakest_first&subjectId=${item.subjectId}`}
                  className="px-2.5 py-1 rounded border border-border bg-bg hover:border-turmeric text-text text-xs font-mono font-medium hover:text-turmeric transition-colors"
                >
                  Practice Now
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {selectedAudit && (
        <ExplainableNumberModal
          isOpen={true}
          onClose={() => setSelectedAudit(null)}
          title={`Audit Ledger: ${selectedAudit.name}`}
          currentValue={selectedAudit.value}
          conceptId={selectedAudit.id}
          unit="%"
        />
      )}
    </div>
  );
};

export const ConceptDecayCurve: React.FC<{
  conceptId: string;
  conceptName: string;
}> = ({ conceptId, conceptName }) => {
  const [data, setData] = useState<{
    curveData: { day: string; daysFromNow: number; value: number }[];
    reviewHistory: { id: string; grade: number; beforeValue: number; afterValue: number; timestamp: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/depreciation?conceptId=${conceptId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [conceptId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-mono text-text-muted animate-pulse">
        Plotting memory retention timeline...
      </div>
    );
  }

  if (!data?.curveData || data.curveData.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-body text-text-muted">
        No active repetition cards attached to this concept yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
            Memory Retention Trajectory (30 Days)
          </span>
          <h4 className="font-heading font-semibold text-text">{conceptName}</h4>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="inline-block w-2.5 h-0.5 bg-sindoor" />
          <span className="text-text-muted">Retention Curve</span>
          <span className="inline-block w-2.5 h-0.5 bg-sindoor/40 border border-dashed border-sindoor" />
          <span className="text-sindoor">50% Target Recall</span>
        </div>
      </div>

      <div className="h-56 w-full font-mono text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" stroke="#888888" fontSize={10} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#888888" fontSize={10} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-surface border border-border p-2 rounded shadow-md text-xs font-mono">
                      <p className="font-bold text-text">{p.day}</p>
                      <p className="text-sindoor">Retention: {p.value}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={50} stroke="#7A3B24" strokeDasharray="3 3" label={{ value: "Target 50%", fill: "#7A3B24", fontSize: 9 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7A3B24"
              strokeWidth={2}
              dot={{ r: 3, fill: "#7A3B24" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.reviewHistory && data.reviewHistory.length > 0 && (
        <div className="pt-2 border-t border-border">
          <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider block mb-1">
            Past Review Sessions
          </span>
          <div className="flex flex-wrap gap-2">
            {data.reviewHistory.map((rev) => (
              <div
                key={rev.id}
                className="px-2 py-1 rounded bg-surface border border-border font-mono text-[10px] flex items-center gap-1.5"
              >
                <span className="text-leaf font-bold">Grade {rev.grade}</span>
                <span className="text-text-muted">
                  {new Date(rev.timestamp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-text font-medium">
                  {rev.beforeValue.toFixed(0)} → {rev.afterValue.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
