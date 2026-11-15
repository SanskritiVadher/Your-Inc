"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mic, Building2, ArrowRight, Sparkles, Award } from "lucide-react";

interface ColdCallData {
  available: boolean;
  conceptName?: string;
  company?: string;
  question?: string;
  subjectCode?: string;
}

export const DailyColdCallWidget: React.FC = () => {
  const [data, setData] = useState<ColdCallData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/boardroom/cold-call")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data?.available) return null;

  return (
    <div className="p-4 sm:p-5 rounded-lg border-2 border-turmeric/50 bg-surface/90 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 font-body">
      <div className="space-y-1.5 max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-turmeric/20 text-turmeric font-bold uppercase tracking-wider">
            Daily Discussion Practice
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Topic: {data.subjectCode} · {data.conceptName}
          </span>
        </div>

        <p className="font-heading text-base sm:text-lg text-text leading-snug line-clamp-2">
          &ldquo;{data.question}&rdquo;
        </p>

        <p className="font-body text-xs text-text-muted">
          Practice speaking on case questions with AI feedback on Structure, Insight, and Evidence.
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
        <Link
          href="/boardroom?tab=cold-call"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-turmeric/20 border border-turmeric/50 text-text font-mono text-xs font-semibold hover:bg-turmeric/30 transition-colors shadow-xs"
        >
          <Mic size={14} className="text-turmeric" />
          <span>Practice Answer</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};
