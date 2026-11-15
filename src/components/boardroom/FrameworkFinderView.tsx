"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { FrameworkRecommendation } from "@/lib/frameworks/frameworkFinderService";

export function FrameworkFinderView() {
  const { success, error: toastError } = useToast();
  const [problemDescription, setProblemDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<FrameworkRecommendation[]>([]);
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/boardroom/framework-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemDescription }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find frameworks");

      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error finding frameworks");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (fw: FrameworkRecommendation) => {
    try {
      const res = await fetch("/api/boardroom/framework-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_note",
          frameworkName: fw.name,
          whyItFits: fw.whyItFits,
          howToApply: fw.howToApply,
          limitation: fw.limitation,
          subjectId: fw.subjectId,
          deckId: fw.deckId,
          slideNumber: fw.slideNumber,
        }),
      });

      if (!res.ok) throw new Error("Failed to save note");
      setSavedNotes((prev) => ({ ...prev, [fw.name]: true }));
      success("Saved to your notes", `Framework "${fw.name}" added to your study notes.`);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error saving note");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-lg border border-border/80 bg-surface space-y-2">
        <span className="text-[11px] font-semibold text-leaf uppercase tracking-wider font-body">
          Strategic Problem Solving
        </span>
        <h2 className="font-heading text-2xl text-text font-normal">
          Find a framework
        </h2>
        <p className="text-xs text-text-muted font-body max-w-2xl leading-relaxed">
          Describe any business problem or case question in everyday language. We will match it to frameworks taught in your own course decks first, along with a clear guide on how to apply them.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="pt-3 space-y-3">
          <textarea
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe your situation in plain words (e.g., 'We have a subscription software product where customer cancellations are rising each quarter because competitors offer free tiers, but cutting our price hurts margins...')"
            className="w-full p-3 rounded border border-border bg-bg text-text font-body text-xs sm:text-sm focus:outline-none focus:border-cobalt placeholder:text-text-muted/60 leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 text-[11px] text-text-muted">
              <span>Try:</span>
              <button
                type="button"
                onClick={() => setProblemDescription("Our battery supplier is raising prices, while electric vehicle customers resist any price hikes. What should we do?")}
                className="px-2 py-0.5 rounded bg-surface border border-border/60 hover:border-cobalt/40 text-text hover:text-cobalt transition-colors"
              >
                Supplier vs Buyer Power
              </button>
              <button
                type="button"
                onClick={() => setProblemDescription("We need to decide whether to enter the European market with our existing product line or build a new product for domestic customers.")}
                className="px-2 py-0.5 rounded bg-surface border border-border/60 hover:border-cobalt/40 text-text hover:text-cobalt transition-colors"
              >
                Growth & Expansion
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !problemDescription.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-cobalt text-white dark:text-[#141B2D] text-xs font-body font-medium hover:bg-cobalt/90 disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Sparkles size={14} />
              <span>{loading ? "Matching frameworks..." : "Find frameworks"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-body text-text-muted px-1">
            <span>Recommended frameworks for your problem ({recommendations.length})</span>
            <span>Your course decks prioritized</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((fw, idx) => {
              const isExternal = fw.sourceType === "external";
              const isSaved = savedNotes[fw.name];

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-lg border transition-all ${
                    isExternal
                      ? "border-border/80 bg-surface/60"
                      : "border-cobalt/40 bg-surface shadow-2xs"
                  }`}
                >
                  {/* Top Bar: Title, Source badge, and Save as note */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            isExternal
                              ? "bg-border/60 text-text-muted"
                              : "bg-cobalt/10 text-cobalt border border-cobalt/20"
                          }`}
                        >
                          {fw.sourceLabel}
                        </span>

                        {fw.deckId && (
                          <Link
                            href={`/decks/${fw.deckId}?slide=${fw.slideNumber || 1}`}
                            className="inline-flex items-center gap-1 text-[11px] text-cobalt hover:underline font-body"
                          >
                            <span>Open lecture slide</span>
                            <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>

                      <h3 className="font-heading text-xl text-text font-normal">
                        {fw.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveNote(fw)}
                      disabled={isSaved}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-body transition-colors ${
                        isSaved
                          ? "bg-leaf/10 text-leaf border border-leaf/30 cursor-default"
                          : "bg-surface border border-border text-text hover:bg-bg"
                      }`}
                    >
                      {isSaved ? <CheckCircle2 size={13} /> : <Bookmark size={13} />}
                      <span>{isSaved ? "Saved as note" : "Save as note"}</span>
                    </button>
                  </div>

                  {/* Why it fits (2 lines) */}
                  <div className="py-3 border-b border-border/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Why it fits
                    </span>
                    <p className="text-xs text-text font-body leading-relaxed">
                      {fw.whyItFits}
                    </p>
                  </div>

                  {/* How to apply to problem (3 steps) */}
                  <div className="py-3 border-b border-border/40 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      How to apply to your problem (3 steps)
                    </span>
                    <ol className="space-y-1.5 text-xs text-text font-body">
                      {fw.howToApply.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-border/40 flex items-center justify-center text-[10px] font-semibold text-text-muted shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="leading-snug pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* One limitation */}
                  <div className="pt-3 flex items-start gap-2 text-xs font-body text-text-muted">
                    <AlertTriangle size={14} className="text-turmeric shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-text">Limitation to watch: </span>
                      <span>{fw.limitation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
