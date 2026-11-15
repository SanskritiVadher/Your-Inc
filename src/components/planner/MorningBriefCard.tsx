"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Clock,
  RotateCcw,
  AlertTriangle,
  Mic,
  Brain,
  ArrowRight,
  BookOpen,
  MapPin,
} from "lucide-react";

interface MorningBriefData {
  id?: string;
  date: string;
  classes: {
    subjectCode: string;
    subjectName: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
  dueReviewsCount: number;
  highestRiskDeadline?: {
    id: string;
    title: string;
    subjectCode: string;
    daysLeft: number;
    riskScore: number;
    weight: number;
    urgencyLevel: string;
  } | null;
  coldCallQuestion?: {
    question: string;
    subjectCode: string;
    conceptName: string;
  } | null;
  professorNote?: string | null;
  readTimeSeconds: number;
}

export const MorningBriefCard: React.FC = () => {
  const [brief, setBrief] = useState<MorningBriefData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/planner/morning-brief")
      .then((res) => res.json())
      .then((data) => {
        if (data.brief) setBrief(data.brief);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load morning brief:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-5 border-2 border-turmeric/50 rounded-lg bg-surface/90 font-mono text-xs text-text-muted animate-pulse">
        Compiling daily morning dossier...
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="p-5 sm:p-6 rounded-xl border-2 border-turmeric bg-surface/95 shadow-md relative overflow-hidden font-body space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <Sun size={20} className="text-turmeric shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-turmeric/15 text-turmeric">
                Daily briefing
              </span>
              <span className="text-xs text-text-muted">
                Under {brief.readTimeSeconds}s read
              </span>
            </div>
            <h2 className="font-heading text-xl text-text font-normal mt-0.5">
              Today&apos;s schedule and focus
            </h2>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs text-text-muted">
          <span>{new Date(brief.date).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {/* 4-Quadrant Executive Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {/* 1. Today's Classes */}
        <div className="p-3.5 rounded-lg bg-bg border border-border space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold">
              <span>Today&apos;s Classes</span>
              <Clock className="w-3.5 h-3.5 text-turmeric" />
            </div>
            {brief.classes.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {brief.classes.map((cls, idx) => (
                  <div key={idx} className="border-b border-border/40 pb-1 last:border-b-0">
                    <span className="font-bold text-text block">{cls.subjectCode} · {cls.startTime}</span>
                    <span className="text-[10px] text-text-muted block truncate">{cls.subjectName} ({cls.room})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-xs text-text-muted mt-2 italic">
                No scheduled lectures today. Great time to catch up on cards waiting.
              </p>
            )}
          </div>
        </div>

        {/* 2. Due Reviews */}
        <div className="p-3.5 rounded-lg bg-bg border border-border space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold">
              <span>Due for Review</span>
              <RotateCcw className="w-3.5 h-3.5 text-leaf" />
            </div>
            <div className="font-heading text-3xl text-leaf font-bold mt-2">
              {brief.dueReviewsCount} Cards
            </div>
            <p className="font-body text-xs text-text-muted mt-1 leading-snug">
              Review your cards waiting to keep memory retention and topic recall strong.
            </p>
          </div>
          <Link
            href="/review"
            className="text-[11px] font-mono text-leaf hover:underline flex items-center gap-1 font-bold pt-1"
          >
            <span>Start Review</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 3. Highest Risk Deadline */}
        <div className="p-3.5 rounded-lg bg-bg border border-border space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold">
              <span>Priority Deadline</span>
              <AlertTriangle className="w-3.5 h-3.5 text-sindoor" />
            </div>
            {brief.highestRiskDeadline ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold px-1.5 py-0.2 rounded bg-sindoor/20 text-sindoor text-[10px]">
                    Risk {brief.highestRiskDeadline.riskScore.toFixed(0)}
                  </span>
                  <span className="text-text font-bold text-xs truncate">
                    {brief.highestRiskDeadline.subjectCode}
                  </span>
                </div>
                <div className="font-heading text-sm text-text font-bold truncate">
                  {brief.highestRiskDeadline.title}
                </div>
                <div className="text-[10px] text-text-muted">
                  Due in {brief.highestRiskDeadline.daysLeft} days (Weight: {brief.highestRiskDeadline.weight}%)
                </div>
              </div>
            ) : (
              <p className="font-body text-xs text-text-muted mt-2 italic">
                All assignments on schedule. Deadline record on track.
              </p>
            )}
          </div>
          <Link
            href="/planner"
            className="text-[11px] font-mono text-sindoor hover:underline flex items-center gap-1 font-bold pt-1"
          >
            <span>View Assignment</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 4. One Cold Call Case Pushback */}
        <div className="p-3.5 rounded-lg bg-bg border border-border space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold">
              <span>Discussion Question</span>
              <Mic className="w-3.5 h-3.5 text-indigo" />
            </div>
            {brief.coldCallQuestion ? (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] text-indigo font-bold block">
                  {brief.coldCallQuestion.subjectCode} · {brief.coldCallQuestion.conceptName}
                </span>
                <p className="font-heading text-xs text-text line-clamp-3 leading-snug">
                  &ldquo;{brief.coldCallQuestion.question}&rdquo;
                </p>
              </div>
            ) : (
              <p className="font-body text-xs text-text-muted mt-2 italic">
                Ready for discussion practice.
              </p>
            )}
          </div>
          <Link
            href="/boardroom"
            className="text-[11px] font-mono text-indigo hover:underline flex items-center gap-1 font-bold pt-1"
          >
            <span>Practice with AI Tutor</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Professor Memory Line if relevant */}
      {brief.professorNote && (
        <div className="p-3 rounded-lg bg-indigo/10 border border-indigo/30 flex items-start gap-2.5 text-xs font-mono text-text">
          <Brain className="w-4 h-4 text-indigo shrink-0 mt-0.5" />
          <div>
            <strong className="text-indigo uppercase text-[10px] block font-bold">
              Faculty Dossier Memory:
            </strong>
            <span className="font-body text-text mt-0.5 block leading-relaxed">
              {brief.professorNote}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
