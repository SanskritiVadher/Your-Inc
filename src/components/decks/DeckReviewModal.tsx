"use client";

import React, { useState } from "react";
import { CheckCircle2, Trash2, Edit2, Sparkles, AlertTriangle, Layers, BookOpen, HelpCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { CardType, QuestionType } from "@prisma/client";

export interface ReviewConceptItem {
  name: string;
  definition: string;
  sourceSlideNumber: number;
  suggestMerge?: boolean;
  matchedConceptId?: string;
  matchedConceptName?: string;
  similarity?: number;
  mergeConfirmed?: boolean;
}

export interface ReviewCardItem {
  type: CardType;
  conceptName: string;
  front: string;
  back: string;
  errorExplanation?: string;
  sourceSlideNumber: number;
}

export interface ReviewQuestionItem {
  type: QuestionType;
  text: string;
  answerGuide: string;
  difficulty: string;
  sourceSlideNumber: number;
}

interface DeckReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  deckTitle: string;
  initialSummary: string;
  initialConcepts: ReviewConceptItem[];
  initialCards: ReviewCardItem[];
  initialQuestions: ReviewQuestionItem[];
  onCommitSuccess?: () => void;
}

export const DeckReviewModal: React.FC<DeckReviewModalProps> = ({
  isOpen,
  onClose,
  deckId,
  deckTitle,
  initialSummary,
  initialConcepts,
  initialCards,
  initialQuestions,
  onCommitSuccess,
}) => {
  const { success, error: toastError } = useToast();

  const [summary, setSummary] = useState(initialSummary);
  const [concepts, setConcepts] = useState<ReviewConceptItem[]>(initialConcepts);
  const [cards, setCards] = useState<ReviewCardItem[]>(initialCards);
  const [questions, setQuestions] = useState<ReviewQuestionItem[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<"summary" | "concepts" | "cards" | "questions">("summary");
  const [isCommitting, setIsCommitting] = useState(false);

  const handleCommitAll = async () => {
    setIsCommitting(true);
    try {
      const payload = {
        summary,
        concepts: concepts.map((c) => ({
          name: c.name,
          definition: c.definition,
          sourceSlideNumber: c.sourceSlideNumber,
          mergeIntoId: c.mergeConfirmed ? c.matchedConceptId : undefined,
        })),
        cards,
        questions,
      };

      const res = await fetch(`/api/decks/${deckId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit study system");
      }

      success("Study System Committed", `Capitalized ${data.conceptsCount} concepts, ${data.cardsCount} cards, and ${data.questionsCount} questions!`);
      if (onCommitSuccess) onCommitSuccess();
      onClose();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Commit error");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Study Material: ${deckTitle}`}
      description="Review summary, concepts, review cards & questions before saving to your notebook"
      className="max-w-4xl"
    >
      <div className="space-y-6 font-body text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 uppercase tracking-wider font-semibold border-b-2 -mb-[2px] ${
              activeTab === "summary"
                ? "border-sindoor text-sindoor"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Session Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("concepts")}
            className={`px-4 py-2 uppercase tracking-wider font-semibold border-b-2 -mb-[2px] ${
              activeTab === "concepts"
                ? "border-sindoor text-sindoor"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Concepts ({concepts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`px-4 py-2 uppercase tracking-wider font-semibold border-b-2 -mb-[2px] ${
              activeTab === "cards"
                ? "border-sindoor text-sindoor"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Recall Cards ({cards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 uppercase tracking-wider font-semibold border-b-2 -mb-[2px] ${
              activeTab === "questions"
                ? "border-sindoor text-sindoor"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Exam & Case Questions ({questions.length})
          </button>
        </div>

        {/* TAB 1: SUMMARY */}
        {activeTab === "summary" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Executive Session Summary (Strictly max 150 words)
              </label>
              <span className="font-mono text-[11px] text-text-muted">
                {summary.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-bg/50 p-3 text-xs leading-relaxed text-text focus:outline-none focus:border-sindoor"
            />
          </div>
        )}

        {/* TAB 2: CONCEPTS */}
        {activeTab === "concepts" && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {concepts.map((c, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[2px] border border-border bg-bg/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border">
                      Slide {c.sourceSlideNumber}
                    </span>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => {
                        const updated = [...concepts];
                        updated[idx].name = e.target.value;
                        setConcepts(updated);
                      }}
                      className="font-heading text-sm font-semibold text-text bg-transparent border-b border-transparent hover:border-border focus:border-sindoor focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setConcepts(concepts.filter((_, i) => i !== idx))}
                    className="text-text-muted hover:text-sindoor p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={c.definition}
                  onChange={(e) => {
                    const updated = [...concepts];
                    updated[idx].definition = e.target.value;
                    setConcepts(updated);
                  }}
                  className="w-full rounded-[2px] border border-border/60 bg-surface p-2 text-xs text-text focus:outline-none focus:border-sindoor"
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: CARDS */}
        {activeTab === "cards" && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {cards.map((card, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[2px] border border-border bg-bg/50 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold text-sindoor uppercase">
                    {card.type}
                  </span>
                  <span className="text-text-muted">Slide {card.sourceSlideNumber}</span>
                  <button
                    type="button"
                    onClick={() => setCards(cards.filter((_, i) => i !== idx))}
                    className="text-text-muted hover:text-sindoor"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted">Prompt (Front)</label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[idx].front = e.target.value;
                      setCards(updated);
                    }}
                    className="w-full rounded-[2px] border border-border/60 bg-surface p-1.5 text-xs text-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted">Answer / Takeaway (Back)</label>
                  <textarea
                    rows={2}
                    value={card.back}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[idx].back = e.target.value;
                      setCards(updated);
                    }}
                    className="w-full rounded-[2px] border border-border/60 bg-surface p-1.5 text-xs text-text"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: QUESTIONS */}
        {activeTab === "questions" && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[2px] border border-border bg-bg/50 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold text-turmeric uppercase">
                    {q.type} ({q.difficulty})
                  </span>
                  <span className="text-text-muted">Slide {q.sourceSlideNumber}</span>
                  <button
                    type="button"
                    onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                    className="text-text-muted hover:text-sindoor"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[idx].text = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full rounded-[2px] border border-border/60 bg-surface p-1.5 text-xs text-text font-medium"
                />
                <textarea
                  rows={2}
                  value={q.answerGuide}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[idx].answerGuide = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full rounded-[2px] border border-border/60 bg-surface p-1.5 text-xs text-text"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isCommitting}
            onClick={handleCommitAll}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-[2px] bg-sindoor text-white font-mono text-xs uppercase tracking-wider font-semibold shadow-xs hover:bg-sindoor/90 transition-all disabled:opacity-40"
          >
            <CheckCircle2 size={15} />
            <span>{isCommitting ? "Saving..." : "Accept All & Save to Notebook"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeckReviewModal;
