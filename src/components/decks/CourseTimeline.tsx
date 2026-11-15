"use client";

import React from "react";
import Link from "next/link";
import { RotateCcw, BookOpen, Clock, Lock, Users, AlertCircle } from "lucide-react";

export interface TimelineDeckItem {
  id: string;
  title: string;
  sessionNumber?: number | null;
  slideCount: number;
  sessionStatus: "Untouched" | "Reviewed" | "Depreciating" | "Strong" | string;
  isSharedWithCohort: boolean;
  subject?: { id: string; name: string; code: string } | null;
}

interface CourseTimelineProps {
  decks: TimelineDeckItem[];
  onToggleShare?: (deckId: string, currentShared: boolean) => void;
}

export const CourseTimeline: React.FC<CourseTimelineProps> = ({
  decks,
  onToggleShare,
}) => {
  // Sort decks ordered strictly by session number
  const sortedDecks = [...decks].sort((a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Strong":
        return <span className="px-2 py-0.5 rounded-[2px] bg-leaf/10 text-leaf border border-leaf/30 font-semibold font-mono text-[10px]">● Strong</span>;
      case "Reviewed":
        return <span className="px-2 py-0.5 rounded-[2px] bg-indigo/10 text-indigo border border-indigo/30 font-semibold font-mono text-[10px]">● Reviewed</span>;
      case "Depreciating":
        return <span className="px-2 py-0.5 rounded-[2px] bg-sindoor/10 text-sindoor border border-sindoor/30 font-semibold font-mono text-[10px]">▼ Depreciating</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[2px] bg-bg text-text-muted border border-border font-mono text-[10px]">○ Untouched</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h3 className="font-heading text-lg text-text">Course Session Timeline</h3>
          <p className="text-xs text-text-muted font-body">
            Chronological academic sequence. Track your progress across course sessions.
          </p>
        </div>
      </div>

      <div className="relative pl-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[1.5px] before:bg-border/80 space-y-4">
        {sortedDecks.map((deck) => (
          <div
            key={deck.id}
            className="relative rounded-[3px] border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:border-border/80"
          >
            {/* Timeline node marker */}
            <div className="absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 border-surface bg-sindoor shadow-xs" />

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-body text-xs font-semibold text-sindoor">
                  Session {deck.sessionNumber || "—"}
                </span>
                <span className="font-body text-xs text-text-muted">
                  {deck.subject?.code || "DEPT"}
                </span>
                {getStatusBadge(deck.sessionStatus)}
              </div>

              <h4 className="font-heading text-base text-text">{deck.title}</h4>
              <p className="font-body text-xs text-text-muted">
                {deck.slideCount} slides documented
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cohort Privacy Notice & Toggle */}
              {onToggleShare && (
                <button
                  type="button"
                  onClick={() => onToggleShare(deck.id, deck.isSharedWithCohort)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-body font-medium transition-colors whitespace-nowrap shrink-0 ${
                    deck.isSharedWithCohort
                      ? "border-leaf/50 bg-leaf/10 text-leaf"
                      : "border-border text-text-muted hover:text-text"
                  }`}
                  title={
                    deck.isSharedWithCohort
                      ? "Shared with class. For enrolled students only."
                      : "Private to you. Click to share with class."
                  }
                >
                  {deck.isSharedWithCohort ? <Users size={13} /> : <Lock size={13} />}
                  <span className="whitespace-nowrap">{deck.isSharedWithCohort ? "Shared with Class" : "Private"}</span>
                </button>
              )}

              {/* Action Buttons */}
              <Link
                href={`/decks/${deck.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-surface text-xs font-body font-medium text-text hover:bg-surface-raised transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen size={13} />
                <span className="whitespace-nowrap">Open Slides</span>
              </Link>

              {/* One-click "Revise this session" */}
              <Link
                href={`/review?deckId=${deck.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cobalt text-white text-xs font-body font-medium shadow-xs hover:bg-cobalt/90 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw size={13} />
                <span className="whitespace-nowrap">Revise Session</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseTimeline;
