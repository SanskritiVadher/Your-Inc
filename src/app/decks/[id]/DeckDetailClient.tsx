"use client";

import React, { useState } from "react";
import { SlideViewer, SlideDetailItem } from "@/components/decks/SlideViewer";
import { GapDetector } from "@/components/decks/GapDetector";
import { DeckReviewModal, ReviewConceptItem, ReviewCardItem, ReviewQuestionItem } from "@/components/decks/DeckReviewModal";
import { Lock, Users, AlertCircle, RotateCcw, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import Link from "next/link";

interface DeckDetailClientProps {
  initialDeck: {
    id: string;
    title: string;
    summary?: string | null;
    sessionNumber?: number | null;
    sessionStatus: string;
    isSharedWithCohort: boolean;
    subject?: { id: string; name: string; code: string } | null;
    slides: SlideDetailItem[];
  };
}

export const DeckDetailClient: React.FC<DeckDetailClientProps> = ({ initialDeck }) => {
  const { success, error: toastError } = useToast();
  const [deck, setDeck] = useState(initialDeck);
  const [isShared, setIsShared] = useState(initialDeck.isSharedWithCohort);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Review modal state
  const [reviewSummary, setReviewSummary] = useState(deck.summary || "");
  const [reviewConcepts, setReviewConcepts] = useState<ReviewConceptItem[]>([]);
  const [reviewCards, setReviewCards] = useState<ReviewCardItem[]>([]);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestionItem[]>([]);

  const refreshDeck = async () => {
    try {
      const res = await fetch(`/api/decks/${deck.id}`);
      const data = await res.json();
      if (res.ok && data.deck) {
        setDeck(data.deck);
        setIsShared(data.deck.isSharedWithCohort);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCohortShare = async () => {
    const nextShared = !isShared;
    setIsShared(nextShared);
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSharedWithCohort: nextShared }),
      });
      if (res.ok) {
        success(
          nextShared ? "Shared with Class" : "Set to Private",
          nextShared
            ? "Notice: For enrolled students only. Do not distribute outside your class."
            : "Deck is now strictly private to your notebook."
        );
      }
    } catch (e) {
      toastError("Failed to update privacy");
    }
  };

  const handleRegenerateStudySystem = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/decks/${deck.id}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation error");

      setReviewSummary(data.summary);
      setReviewConcepts(data.concepts);
      setReviewCards(data.cards);
      setReviewQuestions(data.questions);
      setIsReviewOpen(true);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to generate study system");
    } finally {
      setIsGenerating(false);
    }
  };

  const gapSlides = deck.slides.filter((s) => s.hasGap);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-body text-sindoor font-semibold">
            <span>Session {deck.sessionNumber || "—"}</span>
            <span>•</span>
            <span>{deck.subject?.name} ({deck.subject?.code})</span>
          </div>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">{deck.title}</h1>
          <PageHeaderBand />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={handleToggleCohortShare}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[2px] border text-xs font-body font-medium transition-colors ${
              isShared
                ? "border-leaf/50 bg-leaf/10 text-leaf"
                : "border-border text-text-muted hover:text-text bg-surface"
            }`}
          >
            {isShared ? <Users size={13} /> : <Lock size={13} />}
            <span>{isShared ? "Shared with Class" : "Private to You"}</span>
          </button>

          {/* Revision Sheet Button */}
          <Link
            href={`/decks/${deck.id}/revision-sheet`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[2px] border border-border bg-surface text-xs font-body font-medium text-text hover:bg-bg transition-colors"
          >
            <FileText size={13} className="text-cobalt" />
            <span>Revision sheet</span>
          </Link>

          {/* Regenerate / Review Button */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleRegenerateStudySystem}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[2px] border border-border bg-surface text-xs font-body font-medium text-text hover:bg-bg transition-colors"
          >
            <Sparkles size={13} className="text-turmeric" />
            <span>{isGenerating ? "Analyzing..." : "Review Study System"}</span>
          </button>

          {/* Revise session button */}
          <Link
            href={`/review?deckId=${deck.id}`}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-[2px] bg-sindoor text-white text-xs font-body font-semibold shadow-xs hover:bg-sindoor/90"
          >
            <RotateCcw size={13} />
            <span>Revise Session</span>
          </Link>
        </div>
      </div>

      {/* Enrolled Student Copyright Notice Banner if shared */}
      {isShared && (
        <div className="p-3 rounded-[3px] border border-primary/40 bg-primary/5 flex items-center space-x-2 text-xs font-mono text-primary">
          <AlertCircle size={15} className="shrink-0" />
          <span>Notice: For enrolled students only. Do not distribute outside your class.</span>
        </div>
      )}

      {/* Gap Detector (if any image-only or low-confidence slides exist) */}
      {gapSlides.length > 0 && (
        <GapDetector
          deckId={deck.id}
          gapSlides={gapSlides}
          onGapResolved={refreshDeck}
        />
      )}

      {/* Two-Pane Interactive Slide Viewer */}
      <SlideViewer
        deckId={deck.id}
        deckTitle={deck.title}
        slides={deck.slides}
      />

      {/* Review Modal */}
      {isReviewOpen && (
        <DeckReviewModal
          isOpen={true}
          onClose={() => setIsReviewOpen(false)}
          deckId={deck.id}
          deckTitle={deck.title}
          initialSummary={reviewSummary}
          initialConcepts={reviewConcepts}
          initialCards={reviewCards}
          initialQuestions={reviewQuestions}
          onCommitSuccess={refreshDeck}
        />
      )}
    </div>
  );
};

export default DeckDetailClient;
