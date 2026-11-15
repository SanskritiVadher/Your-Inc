"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface GapSlideItem {
  id: string;
  number: number;
  gapReason?: string | null;
  studentExplanation?: string | null;
}

interface GapDetectorProps {
  deckId: string;
  gapSlides: GapSlideItem[];
  onGapResolved?: () => void;
}

export const GapDetector: React.FC<GapDetectorProps> = ({
  deckId,
  gapSlides,
  onGapResolved,
}) => {
  const { success, error: toastError } = useToast();
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleResolveGap = async (slide: GapSlideItem) => {
    const text = (explanations[slide.id] || "").trim();
    if (!text) {
      toastError("Please enter your classroom explanation");
      return;
    }

    setSavingId(slide.id);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: slide.id,
          studentExplanation: text,
        }),
      });

      if (!res.ok) throw new Error("Failed to save explanation");

      success(`Slide ${slide.number} Gap Filled`, "Explanation committed to study system");
      if (onGapResolved) onGapResolved();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error saving gap explanation");
    } finally {
      setSavingId(null);
    }
  };

  if (gapSlides.length === 0) return null;

  return (
    <div className="rounded-[3px] border border-turmeric/70 bg-turmeric/5 p-5 space-y-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle size={18} className="text-turmeric shrink-0" />
        <div>
          <h3 className="font-heading text-lg text-text">Fill the Gaps ({gapSlides.length})</h3>
          <p className="text-xs text-text-muted font-body">
            The AI detected visual diagrams, charts, or slides with minimal text. Provide a 1-line classroom explanation to ensure recall questions and cards accurately cover these topics.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {gapSlides.map((slide) => (
          <div
            key={slide.id}
            className="p-3.5 rounded-[2px] border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1 flex-1">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                Slide {slide.number}
              </span>
              <p className="text-text-muted font-body text-[11px]">
                {slide.gapReason || "Visual diagram or minimal text detected."}
              </p>
              <input
                type="text"
                placeholder="What was the professor's main takeaway or formula for this slide?"
                value={explanations[slide.id] ?? slide.studentExplanation ?? ""}
                onChange={(e) =>
                  setExplanations({ ...explanations, [slide.id]: e.target.value })
                }
                className="w-full rounded-[2px] border border-border bg-bg/60 px-3 py-1.5 text-xs text-text focus:outline-none focus:border-sindoor"
              />
            </div>

            <button
              type="button"
              disabled={savingId === slide.id}
              onClick={() => handleResolveGap(slide)}
              className="px-4 py-2 rounded-[2px] bg-turmeric text-white font-mono text-xs uppercase tracking-wider font-semibold hover:bg-turmeric/90 shrink-0 self-end sm:self-center disabled:opacity-50"
            >
              {savingId === slide.id ? "Saving..." : "Fill Gap"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GapDetector;
