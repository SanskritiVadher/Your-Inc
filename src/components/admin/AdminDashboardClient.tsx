"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  DollarSign,
  Sliders,
  Inbox,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  aiRating: boolean | null;
  ratingReason: string | null;
  status: string;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

interface AdminDashboardClientProps {
  initialData: {
    metrics: any;
    aiCost: any;
    featureFlags: FeatureFlag[];
    feedbacks: FeedbackItem[];
    users: any[];
    cohorts: any[];
  };
}

export function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"metrics" | "cost" | "flags" | "inbox" | "report">("metrics");
  const [flags, setFlags] = useState<FeatureFlag[]>(initialData.featureFlags);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  // Week-3 report state
  const [week3Report, setWeek3Report] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const refreshData = async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setFlags(json.featureFlags);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    try {
      setTogglingFlag(key);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_flag",
          key,
          enabled: !currentEnabled,
        }),
      });

      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.key === key ? { ...f, enabled: !currentEnabled } : f))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingFlag(null);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_week3_report" }),
      });
      if (res.ok) {
        const json = await res.json();
        setWeek3Report(json.report);
        setActiveTab("report");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_feedback", feedbackId, status: "RESOLVED" }),
      });
      if (res.ok) refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const { metrics, aiCost, feedbacks } = data;

  return (
    <div className="space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Admin Console
            </span>
            <span className="font-body text-xs text-text-muted">System &amp; Class Activity</span>
          </div>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            System Administration
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Active learners, AI cost attribution, student feedback, and runtime feature flags.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="font-mono text-xs flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            {generatingReport ? "Synthesizing Report..." : "Generate Week-3 Pilot Report"}
          </Button>
        </div>
      </div>

      {/* Admin Tab Bar */}
      <div className="flex border-b border-border font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "metrics"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          North-Star & Funnel
        </button>

        <button
          onClick={() => setActiveTab("cost")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "cost"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          AI Cost Controls (${aiCost.total30DayCost})
        </button>

        <button
          onClick={() => setActiveTab("flags")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "flags"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Runtime Feature Flags ({flags.length})
        </button>

        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "inbox"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Feedback Inbox ({feedbacks.length})
        </button>

        {week3Report && (
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === "report"
                ? "border-leaf text-text font-bold bg-paper"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Week-3 Empirical Report
          </button>
        )}
      </div>

      {/* TAB 1: NORTH-STAR & COHORT FUNNEL */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* North-Star Metric Primary Banner */}
          <div className="border border-leaf/40 bg-leaf/5 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-leaf font-bold block">
                  NORTH-STAR METRIC (NOT SIGNUPS &bull; NOT PAGE VIEWS)
                </span>
                <div className="font-heading text-4xl text-text font-normal mt-1">
                  {metrics.northStarWAL} Weekly Active Learners
                </div>
                <p className="text-xs text-text-muted font-body mt-0.5">
                  Students who completed at least 1 verified review reinvestment session in the last 7 days.
                </p>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs text-right">
                <div>
                  <span className="text-[10px] text-text-muted uppercase">Reviews / Active User</span>
                  <div className="text-xl font-bold text-text mt-0.5">{metrics.reviewsPerActiveUser}</div>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase">Time to 1st Review</span>
                  <div className="text-xl font-bold text-text mt-0.5">{metrics.avgTimeToFirstReviewMins}m</div>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase">Decks / Student</span>
                  <div className="text-xl font-bold text-text mt-0.5">{metrics.decksPerUser}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Retention & Conversion Funnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="border border-border bg-paper p-5 space-y-4">
              <h4 className="font-heading text-lg font-medium text-text">
                Pilot Conversion Funnel
              </h4>
              <div className="space-y-2.5 font-mono text-xs">
                {metrics.funnel.map((step: any, idx: number) => (
                  <div key={step.step} className="p-2.5 bg-paper-sunken border border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text">
                        0{idx + 1}. {step.step}
                      </span>
                      <span className="text-leaf font-bold">{step.count} users ({step.conversionPct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention Rates (D1, D7, D30) */}
            <div className="border border-border bg-paper p-5 space-y-4">
              <h4 className="font-heading text-lg font-medium text-text">
                Class Retention Trajectory
              </h4>
              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="p-3 bg-paper-sunken border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">D1 Retention</span>
                  <div className="text-2xl font-bold text-text mt-1">{metrics.retention.d1}%</div>
                  <span className="text-[10px] text-text-muted">Day 1 Activation</span>
                </div>
                <div className="p-3 bg-paper-sunken border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">D7 Retention</span>
                  <div className="text-2xl font-bold text-leaf mt-1">{metrics.retention.d7}%</div>
                  <span className="text-[10px] text-text-muted">1-Week Return</span>
                </div>
                <div className="p-3 bg-paper-sunken border border-border">
                  <span className="text-[10px] uppercase text-text-muted block">D30 Retention</span>
                  <div className="text-2xl font-bold text-text mt-1">{metrics.retention.d30}%</div>
                  <span className="text-[10px] text-text-muted">Monthly Habit</span>
                </div>
              </div>

              {/* Feature Usage Rankings */}
              <div className="pt-2 border-t border-border space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-text-muted block">
                  Feature Engagement Ranking
                </span>
                <div className="divide-y divide-border border border-border font-mono text-xs">
                  {metrics.featureUsage.map((f: any) => (
                    <div key={f.feature} className="p-2 flex items-center justify-between">
                      <span className="text-text">{f.feature}</span>
                      <span className="font-bold text-text">{f.count} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI COST CONTROLS */}
      {activeTab === "cost" && (
        <div className="border border-border bg-paper p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                AI Budget Architecture
              </span>
              <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
                Token Cost & Spending Controls
              </h3>
              <p className="text-xs text-text-muted font-body mt-0.5">
                Model tiering strategy: cheap models for flashcard generation; stronger models exclusively for case grading and mock interviews.
              </p>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-[10px] text-text-muted uppercase">Cost / Active User / Week</span>
              <div className="text-2xl font-bold text-leaf">${aiCost.costPerActiveUser}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-paper-sunken border border-border space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase text-text-muted font-bold block">
                Cost by Academic Feature (30 Days)
              </span>
              <div className="divide-y divide-border">
                {aiCost.costByFeature.map((item: any) => (
                  <div key={item.feature} className="py-2 flex items-center justify-between">
                    <span className="text-text capitalize">{item.feature.replace(/_/g, " ")}</span>
                    <span className="font-bold text-text">${item.cost.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-paper-sunken border border-border space-y-3 font-mono text-xs">
              <span className="text-[10px] uppercase text-text-muted font-bold block">
                Guardrail Policies
              </span>
              <div className="space-y-2 text-text-muted">
                <div className="p-2.5 bg-paper border border-border flex items-center justify-between">
                  <span>Student Daily Cap:</span>
                  <span className="font-bold text-text">$0.50 / student / day</span>
                </div>
                <div className="p-2.5 bg-paper border border-border flex items-center justify-between">
                  <span>Section Monthly Cap:</span>
                  <span className="font-bold text-text">$50.00 / section / mo</span>
                </div>
                <div className="p-2.5 bg-paper border border-border flex items-center justify-between">
                  <span>80% Cap Alert:</span>
                  <span className="font-bold text-leaf">Active (Admin Notice)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RUNTIME FEATURE FLAGS */}
      {activeTab === "flags" && (
        <div className="border border-border bg-paper p-6 space-y-4">
          <div className="border-b border-border pb-3">
            <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
              Live Governance
            </span>
            <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
              Runtime Feature Switches
            </h3>
            <p className="text-xs text-text-muted font-body mt-0.5">
              Turn any capability off immediately if an API fails or in exam mode without a redeploy.
            </p>
          </div>

          <div className="divide-y divide-border border border-border bg-paper-sunken">
            {flags.map((flag) => (
              <div key={flag.key} className="p-4 flex items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{flag.key}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] ${
                        flag.enabled
                          ? "bg-leaf/10 border border-leaf/30 text-leaf font-bold"
                          : "bg-terracotta/10 border border-terracotta/30 text-terracotta"
                      }`}
                    >
                      {flag.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">{flag.description}</p>
                </div>

                <Button
                  size="sm"
                  variant={flag.enabled ? "outline" : "primary"}
                  disabled={togglingFlag === flag.key}
                  onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                  className="font-mono text-xs"
                >
                  {flag.enabled ? "Turn Off" : "Turn On"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FEEDBACK INBOX */}
      {activeTab === "inbox" && (
        <div className="border border-border bg-paper p-6 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-heading text-2xl text-text font-normal">
              Student Feedback Inbox ({feedbacks.length})
            </h3>
            <p className="text-xs text-text-muted font-body mt-0.5">
              Includes exam survey answers: &ldquo;What would make you open this before an exam?&rdquo;
            </p>
          </div>

          {feedbacks.length === 0 ? (
            <div className="p-8 border border-dashed border-border text-center bg-paper-sunken font-mono text-xs text-text-muted">
              Inbox clear. Zero student complaints or bug tickets logged.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border bg-paper">
              {feedbacks.map((item) => (
                <div key={item.id} className="p-4 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-paper-sunken border border-border text-[10px] font-bold text-text uppercase">
                        {item.type}
                      </span>
                      {item.user && (
                        <span className="text-text-muted text-[11px]">{item.user.name} ({item.user.email})</span>
                      )}
                      <span className="text-text-muted text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    {item.status === "NEW" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveFeedback(item.id)}
                        className="font-mono text-[10px] py-0.5 px-2 flex items-center gap-1"
                      >
                        <Check size={11} /> Mark Resolved
                      </Button>
                    )}
                  </div>

                  <p className="text-xs font-body text-text leading-relaxed">
                    &ldquo;{item.content}&rdquo;
                  </p>

                  {item.ratingReason && (
                    <div className="text-[11px] text-text-muted font-body italic bg-paper-sunken p-2 border border-border">
                      Reason: {item.ratingReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WEEK-3 PILOT REPORT */}
      {activeTab === "report" && week3Report && (
        <div className="border border-border bg-paper p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <span className="font-mono text-xs uppercase tracking-widest text-leaf font-bold">
              FACTUAL PILOT SYNTHESIS
            </span>
            <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
              Week-3 Class Performance Report
            </h3>
            <p className="text-xs text-text-muted font-mono mt-0.5">
              Generated: {new Date(week3Report.generatedAt).toLocaleString()} &bull; All numbers strictly from database records
            </p>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-paper-sunken border border-border">
              <span className="text-[10px] uppercase text-text-muted">Enrolled Students</span>
              <div className="text-2xl font-bold text-text mt-1">{week3Report.totalEnrolledStudents}</div>
            </div>
            <div className="p-3 bg-paper-sunken border border-border">
              <span className="text-[10px] uppercase text-text-muted">Active Learners (WAL)</span>
              <div className="text-2xl font-bold text-leaf mt-1">{week3Report.weeklyActiveLearners}</div>
            </div>
            <div className="p-3 bg-paper-sunken border border-border">
              <span className="text-[10px] uppercase text-text-muted">D7 Return Rate</span>
              <div className="text-2xl font-bold text-text mt-1">{week3Report.retentionD7}%</div>
            </div>
            <div className="p-3 bg-paper-sunken border border-border">
              <span className="text-[10px] uppercase text-text-muted">AI Cost / Active User</span>
              <div className="text-2xl font-bold text-text mt-1">${week3Report.aiCostPerUser}</div>
            </div>
          </div>

          {/* Top Feedback Themes Clustered */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase font-bold text-text-muted block">
              Top 3 Verified Feedback Themes
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              {week3Report.topFeedbackThemes.map((theme: string, idx: number) => (
                <div key={idx} className="p-2.5 bg-paper-sunken border border-border flex items-center gap-2">
                  <span className="font-bold text-leaf">#{idx + 1}</span>
                  <span className="text-text">{theme}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Actionable Product Decisions */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase font-bold text-text-muted block">
              3 Data-Driven Product Decisions for Next Sprint
            </span>
            <div className="space-y-2">
              {week3Report.productDecisionsNext.map((dec: string, idx: number) => (
                <div key={idx} className="p-3 bg-leaf/5 border border-leaf/30 text-xs font-body text-text flex items-start gap-2.5">
                  <span className="font-mono font-bold text-leaf mt-0.5">0{idx + 1}.</span>
                  <p className="leading-relaxed">{dec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
