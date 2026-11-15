"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  History,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface AuditEntry {
  id: string;
  rating: string;
  previousRating: string | null;
  reason: string;
  timestamp: string;
}

interface CreditStatus {
  creditRating: string;
  cleanDaysCount: number;
  freeSkipsRemaining: number;
  totalSkipsUsedThisMonth: number;
  audits: AuditEntry[];
}

export const CreditRatingWidget: React.FC = () => {
  const [data, setData] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingLoan, setApplyingLoan] = useState(false);
  const [loanMessage, setLoanMessage] = useState<string | null>(null);

  const fetchStatus = () => {
    fetch("/api/economy/credit-rating")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load credit rating:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleApplyBridgeLoan = async () => {
    if (!confirm("Use a rest day? Rest days protect your deadline record during heavy study sprints.")) {
      return;
    }

    setApplyingLoan(true);
    setLoanMessage(null);

    try {
      const res = await fetch("/api/economy/bridge-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Self-regulated rest / study sprint pause" }),
      });
      const resData = await res.json();
      if (res.ok) {
        setLoanMessage(resData.message);
        fetchStatus();
      } else {
        setLoanMessage(`Error: ${resData.error}`);
      }
    } catch (err: unknown) {
      setLoanMessage(err instanceof Error ? err.message : "Failed to apply rest day");
    } finally {
      setApplyingLoan(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 border border-border rounded-lg bg-surface font-mono text-xs text-text-muted animate-pulse">
        Retrieving deadline record...
      </div>
    );
  }

  const hasData = (data?.audits && data.audits.length > 0);
  const rating = data?.creditRating || "AAA";
  const isPrime = ["AAA", "AA", "A"].includes(rating);
  const isSatisfactory = ["BBB", "BB"].includes(rating);

  const statusLabel = !hasData
    ? "Not enough data yet"
    : isPrime
    ? "On track"
    : isSatisfactory
    ? "Slipping"
    : "Behind";

  const statusColor = !hasData
    ? "text-text-muted"
    : isPrime
    ? "text-leaf"
    : isSatisfactory
    ? "text-turmeric"
    : "text-sindoor";

  const statusBg = !hasData
    ? "bg-surface border-border text-text-muted"
    : isPrime
    ? "bg-leaf/10 border-leaf text-leaf"
    : isSatisfactory
    ? "bg-turmeric/10 border-turmeric text-turmeric"
    : "bg-sindoor/10 border-sindoor text-sindoor";

  return (
    <div className="p-5 bg-surface/90 border border-border rounded-lg font-body shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-lg flex items-center justify-center font-heading text-lg font-bold border-2 text-center p-1 ${statusBg}`}
          >
            {hasData ? (rating) : "—"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bg border border-border text-text">
                Deadline Record
              </span>
              <span className={`font-mono text-xs font-bold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-text-muted font-body mt-0.5">
              {!hasData
                ? "Not enough data yet. Complete your first assignment to establish your deadline record."
                : isPrime
                ? "All assignments submitted on time. Excellent consistency."
                : isSatisfactory
                ? "Recent deadline was missed or delayed. 7 clean days will recover your standing."
                : "Multiple assignments overdue. Submit pending work to clear debt."}
            </p>
          </div>
        </div>

        {/* Clean Days / Recovery Tracker */}
        <div className="flex items-center gap-2 text-right">
          <Clock className="w-4 h-4 text-turmeric shrink-0" />
          <div className="text-left sm:text-right">
            <span className="font-mono text-xs font-bold text-text block">
              {data?.cleanDaysCount || 0} / 7 On-Time Days
            </span>
            <span className="font-mono text-[10px] text-text-muted block">
              7 consecutive clean days upgrades standing
            </span>
          </div>
        </div>
      </div>

      {/* Flexible Rest Days Section (Bridge Loan) */}
      <div className="p-4 rounded-lg bg-bg border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-turmeric" />
            <span className="font-heading text-sm text-text font-bold">
              Study Rest Days &amp; Flexibility
            </span>
            <span className="font-mono text-[10px] px-2 py-0.2 rounded bg-turmeric/20 text-turmeric font-bold">
              {data?.freeSkipsRemaining ?? 2} Free Rest Days Remaining This Month
            </span>
          </div>
          <p className="font-body text-xs text-text-muted leading-relaxed max-w-xl">
            You get <strong>2 free pause days per month</strong> with zero penalty on your deadline record. Life happens: take time off without feeling guilty or breaking a streak.
          </p>
          <div className="text-[11px] font-mono text-leaf flex items-center gap-1.5 pt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero streak shame. No broken chains, guilt notifications, or red flames.</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleApplyBridgeLoan}
            disabled={applyingLoan}
            className="px-3.5 py-2 rounded bg-surface hover:bg-surface/80 border border-turmeric/80 text-text font-mono text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-turmeric" />
            <span>{applyingLoan ? "Borrowing..." : "Claim Bridge Loan Day"}</span>
          </button>
          <span className="text-[10px] font-mono text-text-muted">
            Used {data?.totalSkipsUsedThisMonth ?? 0} skips this month
          </span>
        </div>
      </div>

      {loanMessage && (
        <div className="p-2.5 rounded bg-turmeric/10 border border-turmeric/30 text-xs font-mono text-text flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-turmeric shrink-0" />
          <span>{loanMessage}</span>
        </div>
      )}

      {/* Credit Rating Audit Trail */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted">
          <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-turmeric" />
            Audit Ledger Trail
          </span>
          <span>Immediate -1 notch on missed deadlines</span>
        </div>

        {data?.audits && data.audits.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {data.audits.map((audit) => {
              const isDowngrade = audit.reason.toLowerCase().includes("missed") || audit.reason.toLowerCase().includes("late");
              return (
                <div
                  key={audit.id}
                  className="p-2 rounded bg-surface border border-border/70 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isDowngrade ? "bg-sindoor/20 text-sindoor" : "bg-leaf/20 text-leaf"
                      }`}
                    >
                      {audit.previousRating ? `${audit.previousRating} → ${audit.rating}` : audit.rating}
                    </span>
                    <span className="text-text font-body text-xs">{audit.reason}</span>
                  </div>
                  <span className="text-text-muted text-[10px] shrink-0">
                    {new Date(audit.timestamp).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded bg-bg border border-border/60 text-center text-xs font-mono text-text-muted">
            Clean audit record. No downgrades or delinquent breaches recorded.
          </div>
        )}
      </div>
    </div>
  );
};
