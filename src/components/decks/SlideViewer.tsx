"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Save, AlertTriangle, FileText, CheckCircle2, BookOpen, Layers } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CardType, QuestionType } from "@prisma/client";
import { PageTurn } from "@/components/ui/PageTurn";

export interface SlideDetailItem {
  id: string;
  number: number;
  text: string;
  notes?: string | null;
  imageUrl?: string | null;
  hasGap: boolean;
  gapReason?: string | null;
  studentExplanation?: string | null;
  personalNotes?: string | null;
  cards?: {
    id: string;
    type: CardType;
    front: string;
    back: string;
  }[];
  questions?: {
    id: string;
    type: QuestionType;
    text: string;
    answerGuide: string;
    difficulty?: string | null;
  }[];
}

interface SlideViewerProps {
  deckId: string;
  deckTitle: string;
  slides: SlideDetailItem[];
  initialSlideNumber?: number;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  deckId,
  deckTitle,
  slides,
  initialSlideNumber = 1,
}) => {
  const { success, error: toastError } = useToast();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    Math.max(0, Math.min(initialSlideNumber - 1, slides.length - 1))
  );
  const [isBookMode, setIsBookMode] = useState<boolean>(false);

  // Sync with URL query parameter ?slide=X & ?mode=book on mount and popstate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const slideNumParam = params.get("slide");
      const modeParam = params.get("mode");

      if (slideNumParam) {
        const parsed = parseInt(slideNumParam, 10);
        const foundIdx = slides.findIndex((s) => s.number === parsed);
        if (foundIdx !== -1) {
          setCurrentSlideIndex(foundIdx);
        }
      }

      if (modeParam === "book") {
        setIsBookMode(true);
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [slides]);

  const currentSlide = slides[currentSlideIndex] || slides[0];

  // Personal notes & gap explanation state
  const [personalNotes, setPersonalNotes] = useState(currentSlide?.personalNotes || "");
  const [gapExplanation, setGapExplanation] = useState(currentSlide?.studentExplanation || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingGap, setIsSavingGap] = useState(false);

  // Sync state when slide changes
  useEffect(() => {
    if (currentSlide) {
      setPersonalNotes(currentSlide.personalNotes || "");
      setGapExplanation(currentSlide.studentExplanation || "");
    }
  }, [currentSlideIndex, currentSlide]);

  const goToSlide = useCallback((newIdx: number) => {
    if (newIdx >= 0 && newIdx < slides.length) {
      setCurrentSlideIndex(newIdx);

      // Keep URL per page so back/forward and shareable links work
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("slide", String(slides[newIdx].number));
        if (isBookMode) {
          url.searchParams.set("mode", "book");
        }
        window.history.pushState(null, "", url.toString());
      }
    }
  }, [slides, isBookMode]);

  const toggleBookMode = () => {
    const nextMode = !isBookMode;
    setIsBookMode(nextMode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextMode) {
        url.searchParams.set("mode", "book");
      } else {
        url.searchParams.delete("mode");
      }
      url.searchParams.set("slide", String(currentSlide?.number || 1));
      window.history.pushState(null, "", url.toString());
    }
  };

  // Keyboard navigation: left/right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys if user is typing in a textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(currentSlideIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToSlide(currentSlideIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, goToSlide]);

  const handleSavePersonalNotes = async () => {
    if (!currentSlide) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: currentSlide.id,
          personalNotes,
        }),
      });
      if (res.ok) {
        success("Personal Notes Saved", `Recorded professor commentary for Slide ${currentSlide.number}`);
        currentSlide.personalNotes = personalNotes;
      }
    } catch (e) {
      toastError("Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveGapExplanation = async () => {
    if (!currentSlide || !gapExplanation.trim()) return;
    setIsSavingGap(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: currentSlide.id,
          studentExplanation: gapExplanation.trim(),
        }),
      });
      if (res.ok) {
        success("Gap Filled", `Slide ${currentSlide.number} explanation updated`);
        currentSlide.hasGap = false;
        currentSlide.studentExplanation = gapExplanation.trim();
      }
    } catch (e) {
      toastError("Failed to save explanation");
    } finally {
      setIsSavingGap(false);
    }
  };

  if (!currentSlide) {
    return <div className="text-center font-mono text-xs text-text-muted py-12">No slides found in this deck.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Viewer Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded border border-border/80 bg-surface text-xs font-body">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="font-medium text-text truncate">
            {deckTitle}
          </span>
          <span className="tabular-nums text-text-muted text-xs shrink-0">
            {currentSlide.number} / {slides.length}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Small icon toggle for Book view / Standard view */}
          <button
            type="button"
            onClick={toggleBookMode}
            className={`p-1.5 rounded border transition-colors ${
              isBookMode
                ? "bg-surface border-cobalt/50 text-cobalt shadow-2xs"
                : "border-border text-text-muted hover:text-text hover:bg-surface"
            }`}
            title={isBookMode ? "Standard view" : "Book view"}
            aria-label={isBookMode ? "Standard view" : "Book view"}
          >
            {isBookMode ? <Layers size={15} /> : <BookOpen size={15} />}
          </button>

          <button
            type="button"
            disabled={currentSlideIndex === 0}
            onClick={() => goToSlide(currentSlideIndex - 1)}
            className="p-1.5 rounded border border-border text-text hover:bg-bg disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Slide (← Arrow)"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            disabled={currentSlideIndex === slides.length - 1}
            onClick={() => goToSlide(currentSlideIndex + 1)}
            className="p-1.5 rounded border border-border text-text hover:bg-bg disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Slide (→ Arrow)"
            aria-label="Next Slide"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Render EITHER Book Mode with react-pageflip OR Standard 2-Pane Layout */}
      {isBookMode ? (
        <PageTurn
          onExit={toggleBookMode}
          pages={slides.flatMap((slide, idx) => [
            /* LEFT PAGE: Slide Visual */
            <div key={`slide-${idx}`} className="space-y-3 h-full flex flex-col justify-start">
              <div className="flex items-center justify-between text-xs text-text-muted pb-1.5 border-b border-border/40 mb-2">
                <span className="font-medium text-text text-xs">
                  Canvas
                </span>
              </div>

              <div className="rounded border border-border bg-[#FBF5E8] overflow-hidden shadow-inner aspect-video relative flex items-center justify-center">
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt={`Slide ${slide.number}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <p className="font-body text-xs text-text">{slide.text}</p>
                  </div>
                )}

                {slide.hasGap && (
                  <div className="absolute top-2 right-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-turmeric text-white text-[10px] whitespace-nowrap">
                    <AlertTriangle size={11} />
                    <span>Gap</span>
                  </div>
                )}
              </div>

              {slide.text && (
                <div className="mt-2 p-2 rounded bg-surface/80 border border-border/60">
                  <span className="text-[10px] text-text-muted block mb-0.5">Transcript</span>
                  <p className="text-[11px] font-body text-text leading-relaxed line-clamp-4">{slide.text}</p>
                </div>
              )}
            </div>,

            /* RIGHT PAGE: Notes & Cards */
            <div key={`notes-${idx}`} className="space-y-3 h-full flex flex-col justify-start">
              <div className="flex items-center justify-between text-xs text-text-muted pb-1.5 border-b border-border/40">
                <span className="font-medium text-text text-xs">
                  Notes & Cards
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text font-medium flex items-center gap-1">
                  <FileText size={11} className="text-cobalt" />
                  <span>Class Commentary</span>
                </label>
                <div className="p-2 rounded bg-bg border border-border/60 text-[11px] font-body text-text min-h-[40px]">
                  {slide.personalNotes || <span className="text-text-muted italic">No notes recorded</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-text">
                  Recall Cards ({slide.cards?.length || 0})
                </span>
                {slide.cards && slide.cards.length > 0 ? (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {slide.cards.map((c) => (
                      <div key={c.id} className="p-2 rounded bg-bg border border-border text-[11px] font-body space-y-0.5">
                        <span className="text-[9px] font-medium text-cobalt block">{c.type}</span>
                        <p className="font-medium text-text">{c.front}</p>
                        <p className="text-text-muted text-[10px] line-clamp-2">{c.back}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-body text-text-muted italic py-2 text-center bg-bg/50 rounded border border-dashed border-border">
                    No recall cards for this slide.
                  </p>
                )}
              </div>
            </div>,
          ])}
          onPageChange={(pageIdx) => {
            // Each slide is 2 pages (slide + notes), so map back
            const slideIdx = Math.floor(pageIdx / 2);
            if (slideIdx !== currentSlideIndex) {
              goToSlide(slideIdx);
            }
          }}
          startPage={currentSlideIndex * 2}
          pageLabel="Page"
          showCover={true}
          showControls={true}
          isBookMode={true}
          className="my-2"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANE (Col 7): Original Slide Image & Gap Warning */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[3px] border border-border bg-[#FBF5E8] overflow-hidden shadow-md aspect-video relative flex items-center justify-center">
            {currentSlide.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSlide.imageUrl}
                alt={`Slide ${currentSlide.number}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="p-8 text-center space-y-2">
                <span className="font-mono text-xs text-sindoor uppercase">Slide {currentSlide.number}</span>
                <p className="font-body text-xs text-text">{currentSlide.text}</p>
              </div>
            )}

            {/* Gap Warning Badge on Slide if visual/unclear */}
            {currentSlide.hasGap && (
              <div className="absolute top-3 right-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-[2px] bg-turmeric/90 text-white font-mono text-[11px] shadow-sm backdrop-blur-xs">
                <AlertTriangle size={13} />
                <span>AI Confidence Flag: Visual / Unclear</span>
              </div>
            )}
          </div>

          {/* Fill-the-Gap Interactive Bar */}
          {currentSlide.hasGap && (
            <div className="p-4 rounded border border-turmeric/60 bg-turmeric/10 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-body text-text font-medium">
                <AlertTriangle size={14} className="text-turmeric" />
                <span>Fill the Gap: What was discussed on this slide?</span>
              </div>
              <p className="text-[11px] text-text-muted font-body">
                {currentSlide.gapReason || "The AI detected a diagram or chart with minimal text. Add your classroom explanation to refine recall cards."}
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. Professor Raghavan explained that WACC increases sharply when debt exceeds 60% due to distress costs."
                  value={gapExplanation}
                  onChange={(e) => setGapExplanation(e.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:border-cobalt"
                />
                <button
                  type="button"
                  disabled={isSavingGap || !gapExplanation.trim()}
                  onClick={handleSaveGapExplanation}
                  className="px-3.5 py-1.5 rounded bg-cobalt text-white font-body text-xs font-medium hover:bg-cobalt/90 shrink-0 whitespace-nowrap disabled:opacity-50 transition-colors"
                >
                  {isSavingGap ? "Saving..." : "Fill Gap"}
                </button>
              </div>
            </div>
          )}

          {/* Thumbnails strip */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`relative shrink-0 w-20 h-12 rounded border overflow-hidden transition-all ${
                  idx === currentSlideIndex
                    ? "border-cobalt ring-2 ring-cobalt/30"
                    : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl || ""} alt={`Thumb ${s.number}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-black/70 text-white font-body text-[10px] px-1">
                  {s.number}
                </span>
                {s.hasGap && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-turmeric rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANE (Col 5): Slide Content, Personal Notes, Cards & Questions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Professor Commentary / Personal Student Notes */}
          <div className="rounded border border-border bg-surface p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="font-body text-xs text-text font-medium flex items-center gap-1.5">
                <FileText size={13} className="text-cobalt" />
                <span>Classroom Notes (What Prof Said)</span>
              </span>
              <button
                type="button"
                disabled={isSavingNotes}
                onClick={handleSavePersonalNotes}
                className="inline-flex items-center space-x-1 text-xs font-body text-cobalt hover:underline font-medium whitespace-nowrap"
              >
                <Save size={12} />
                <span>{isSavingNotes ? "Saving..." : "Save Notes"}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="Record specific verbal points, hints, or case nuances the professor emphasized on this slide..."
              className="w-full rounded border border-border/80 bg-bg p-2 text-xs font-body text-text focus:outline-none focus:border-cobalt leading-relaxed"
            />
          </div>

          {/* Section 2: Recall Cards Linked to this Slide */}
          <div className="rounded border border-border bg-surface p-4 space-y-3">
            <h4 className="font-body text-xs text-text font-medium flex items-center justify-between">
              <span>Recall Cards ({currentSlide.cards?.length || 0})</span>
              <span className="text-[11px] text-text-muted">Slide {currentSlide.number}</span>
            </h4>

            {currentSlide.cards && currentSlide.cards.length > 0 ? (
              <div className="space-y-2.5">
                {currentSlide.cards.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-[2px] border border-border/80 bg-bg/60 space-y-1.5 text-xs font-body"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="uppercase text-sindoor font-semibold">{c.type}</span>
                    </div>
                    <p className="font-medium text-text">{c.front}</p>
                    <p className="text-text-muted text-[11px] pt-1 border-t border-border/40 whitespace-pre-line">
                      {c.back}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-body text-text-muted italic py-2 text-center">
                No recall cards tagged to this slide.
              </p>
            )}
          </div>

          {/* Section 3: Questions Linked to this Slide */}
          <div className="rounded border border-border bg-surface p-4 space-y-3">
            <h4 className="font-body text-xs text-text font-medium flex items-center justify-between">
              <span>Exam & Case Questions ({currentSlide.questions?.length || 0})</span>
            </h4>

            {currentSlide.questions && currentSlide.questions.length > 0 ? (
              <div className="space-y-2.5">
                {currentSlide.questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded border border-border/80 bg-bg/60 space-y-1 text-xs font-body"
                  >
                    <span className="text-[10px] font-body text-marigold font-medium">
                      {q.type} ({q.difficulty})
                    </span>
                    <p className="font-medium text-text">{q.text}</p>
                    <p className="text-text-muted text-[11px] pt-1 border-t border-border/40">
                      Answer guide: {q.answerGuide}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-body text-text-muted italic py-2 text-center">
                No exam questions tagged to this slide.
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default SlideViewer;
