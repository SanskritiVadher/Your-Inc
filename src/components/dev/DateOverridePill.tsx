"use client";

import React, { useState, useEffect } from "react";
import { Clock, RefreshCw, X, FastForward, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface DateOverridePillProps {
  isAdmin?: boolean;
}

export const DateOverridePill: React.FC<DateOverridePillProps> = ({ isAdmin = false }) => {
  const { success, error: toastError, info } = useToast();
  const [offsetDays, setOffsetDays] = useState<number>(0);
  const [simulatedDateStr, setSimulatedDateStr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Hide completely unless NODE_ENV === 'development' AND the user is admin
  if (process.env.NODE_ENV !== "development" || !isAdmin) {
    return null;
  }

  // Fetch current simulated date
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/dev/date-override");
      if (res.ok) {
        const data = await res.json();
        setOffsetDays(data.offsetDays || 0);
        setSimulatedDateStr(data.effectiveDate);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAdvance = async (daysToAdd: number) => {
    setLoading(true);
    try {
      const targetOffset = offsetDays + daysToAdd;
      const res = await fetch("/api/dev/date-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offsetDays: targetOffset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance date");

      setOffsetDays(data.simulatedDateOffsetDays);
      setSimulatedDateStr(data.simulatedDate);
      success(`Simulated date advanced by +${daysToAdd} days. Review schedule updated.`);
      
      // Refresh page data so graphs, risk list, and share prices reflect immediately
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to update simulated date");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/date-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offsetDays: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset date");

      setOffsetDays(0);
      setSimulatedDateStr(data.simulatedDate);
      info("Simulated date reset to Today.");
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to reset date");
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-3 right-3 z-50 p-2 rounded-full bg-turmeric/20 text-turmeric border border-turmeric/40 hover:bg-turmeric/30 transition-all text-xs font-mono shadow-md flex items-center gap-1.5"
        title="Open Dev Time Machine"
      >
        <Clock size={14} />
        <span>Dev: {offsetDays > 0 ? `+${offsetDays}d` : "Live"}</span>
      </button>
    );
  }

  const formattedDate = simulatedDateStr
    ? new Date(simulatedDateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Live Today";

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-surface/95 backdrop-blur border-2 border-turmeric/60 shadow-xl rounded-lg p-2.5 max-w-sm text-xs font-body text-text flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
          <div className="flex items-center gap-1.5 font-body text-xs font-medium text-marigold">
            <span className="w-2 h-2 rounded-full bg-marigold animate-ping" />
            <span>Time Travel (Dev)</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-text-muted hover:text-text p-0.5 rounded transition-colors whitespace-nowrap shrink-0"
            title="Minimize"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-body text-xs whitespace-nowrap">
            <Calendar size={13} className="text-cobalt" />
            <span className="font-medium">{formattedDate}</span>
            {offsetDays > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-cobalt/15 text-cobalt font-medium text-[10px] whitespace-nowrap">
                +{offsetDays}d
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleAdvance(5)}
              disabled={loading}
              className="px-2 py-1 rounded bg-surface hover:bg-bg border border-border text-xs font-body font-medium text-text hover:text-cobalt transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Advance 5 days to test recall fading"
            >
              +5d
            </button>
            <button
              onClick={() => handleAdvance(30)}
              disabled={loading}
              className="px-2 py-1 rounded bg-surface hover:bg-bg border border-border text-xs font-body font-medium text-text hover:text-cobalt transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Advance 30 days to simulate vacation lapse"
            >
              +30d
            </button>
            {offsetDays > 0 && (
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-2 py-1 rounded bg-cobalt/10 hover:bg-cobalt/20 border border-cobalt/30 text-xs font-body text-cobalt font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                title="Reset to today's date"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-text-muted font-body leading-tight">
          Advances date for memory calculation to observe topic fading in real time.
        </p>
      </div>
    </div>
  );
};
