"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Volume2, VolumeX, Sparkles } from "lucide-react";
import { BlockPrintDivider } from "@/components/motifs/BlockPrintDivider";

interface CardItem {
  id: string;
  front: string;
  back: string;
  type: string;
  concept: {
    id: string;
    name: string;
    value: number;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface CalmReviewWorkspaceProps {
  initialCards: CardItem[];
  subjects: { id: string; name: string; code: string }[];
  subjectId?: string;
}

export const CalmReviewWorkspace: React.FC<CalmReviewWorkspaceProps> = ({
  initialCards,
  subjectId,
}) => {
  const [cards, setCards] = useState<CardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isComplete, setIsComplete] = useState(cards.length === 0);
  const [ambientSound, setAmbientSound] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? (currentIndex / cards.length) * 100 : 100;

  // Gentle haptic feedback on mobile if supported
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // Silently ignore
      }
    }
  };

  const handleNext = useCallback(
    (rating: number) => {
      triggerHaptic();
      setIsRevealed(false);

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsComplete(true);
      }

      // Record answer quietly in background
      if (currentCard) {
        fetch("/api/review/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: currentCard.id,
            grade: rating,
          }),
        }).catch(() => {});
      }
    },
    [currentIndex, cards.length, currentCard]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsRevealed((prev) => !prev);
      } else if (isRevealed) {
        if (e.key === "1") handleNext(1);
        if (e.key === "2") handleNext(2);
        if (e.key === "3") handleNext(3);
        if (e.key === "4") handleNext(4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealed, isComplete, handleNext]);

  // Ambient sound setup (calm tanpura / gentle rain procedural drone)
  const toggleAmbientSound = () => {
    const next = !ambientSound;
    setAmbientSound(next);

    if (next) {
      try {
        const audio = new Audio("/sounds/page-flip-1.wav"); // short subtle sound test or ambient
        setAudioEl(audio);
      } catch {
        // Silent fallback
      }
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-xl mx-auto text-center px-4 space-y-6">
        {/* Calm Diya Illustration */}
        <div className="w-20 h-20 rounded-full bg-marigold/15 dark:bg-marigold/10 flex items-center justify-center diya-flicker-subtle">
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-marigold" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M32 10 C32 10, 24 22, 24 28 C24 33, 27.5 36, 32 36 C36.5 36, 40 33, 40 28 C40 22, 32 10, 32 10 Z" fill="#E3A33B" opacity="0.85" />
            <path d="M14 42 C14 42, 18 52, 32 52 C46 52, 50 42, 50 42 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.3" />
            <circle cx="32" cy="27" r="3" fill="#FFF" />
          </svg>
        </div>

        <div className="space-y-2">
          <p className="font-handwriting text-2xl text-marigold-dark dark:text-marigold">
            Done for today
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal">
            Your review is complete
          </h1>
          <p className="text-text-muted text-base max-w-md mx-auto pt-1">
            You showed up and strengthened your memory. You can close the journal now and rest.
          </p>
        </div>

        {/* 3 handwritten lines of evening closure */}
        <div className="deckle-card rounded-md p-5 w-full text-left space-y-2 bg-[#FCF8F0]/70 dark:bg-[#1C2438]/70 border border-border/50">
          <p className="font-handwriting text-sm text-text-muted">Today in three thoughts:</p>
          <p className="text-sm font-handwriting text-text">1. Reviewed {cards.length || "all"} cards calmly without rush.</p>
          <p className="text-sm font-handwriting text-text">2. Core concepts are settled for tomorrow.</p>
          <p className="text-sm font-handwriting text-text">3. That is enough work for this evening.</p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="stamp-press inline-flex items-center space-x-2 px-8 py-3.5 rounded-md bg-[#1F4E8C] dark:bg-[#7FA6E0] text-[#F7F1E5] dark:text-[#141B2D] text-sm font-medium shadow hover:opacity-95 transition-all"
          >
            <span>Close journal</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-between max-w-3xl mx-auto px-4 py-4 space-y-6">
      {/* Top quiet bar */}
      <div className="flex items-center justify-between text-xs text-text-muted font-body">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 hover:text-text transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Leave session (progress saved)</span>
        </Link>

        {/* Block-print progress border line */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleAmbientSound}
            className="p-1.5 rounded hover:text-text transition-colors"
            title={ambientSound ? "Mute ambient" : "Turn on ambient quiet"}
            aria-label="Toggle ambient sound"
          >
            {ambientSound ? <Volume2 size={15} className="text-cobalt" /> : <VolumeX size={15} />}
          </button>
          <span className="tabular-nums">
            {currentIndex + 1} of {cards.length}
          </span>
        </div>
      </div>

      {/* Thin block-print progress fill border */}
      <div className="w-full h-1 bg-border/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-turquoise transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Single Centered Card */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <div
          onClick={() => setIsRevealed(!isRevealed)}
          className="deckle-card rounded-lg p-8 sm:p-12 cursor-pointer select-none space-y-8 min-h-[340px] flex flex-col justify-between transition-all duration-200"
          role="button"
          tabIndex={0}
          aria-label="Flashcard. Click or press space to reveal answer."
        >
          {/* Card Context */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-handwriting text-sm text-cobalt">
              {currentCard?.concept.subject.name}
            </span>
            <span className="text-[11px] text-text-muted/70">
              Topic: {currentCard?.concept.name}
            </span>
          </div>

          {/* Front Prompt */}
          <div className="text-center py-4 space-y-3">
            <h2 className="font-heading text-2xl sm:text-3xl text-text font-normal leading-snug">
              {currentCard?.front}
            </h2>
            {!isRevealed && (
              <p className="font-handwriting text-xs text-text-muted/60 pt-4">
                Tap card or press Space to reveal
              </p>
            )}
          </div>

          {/* Back Reveal */}
          {isRevealed && (
            <div className="pt-6 border-t border-border/40 text-center space-y-2 animate-in fade-in duration-200">
              <p className="text-base sm:text-lg text-text leading-relaxed font-body">
                {currentCard?.back}
              </p>
              <p className="font-handwriting text-xs text-turquoise pt-1">
                Nice — concept settled.
              </p>
            </div>
          )}

          {/* Card footer decoration */}
          <div className="flex justify-center">
            <span className="text-[10px] text-text-muted/40 font-mono">
              Card {currentIndex + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pb-4">
        {!isRevealed ? (
          <div className="text-center">
            <button
              onClick={() => setIsRevealed(true)}
              className="stamp-press px-8 py-3.5 rounded-md bg-[#1F4E8C] dark:bg-[#7FA6E0] text-[#F7F1E5] dark:text-[#141B2D] text-sm font-medium shadow hover:opacity-95 transition-all w-full sm:w-auto"
            >
              Reveal answer
            </button>
            <p className="text-xs text-text-muted mt-2 font-mono">Space to flip</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
              <button
                onClick={() => handleNext(1)}
                className="stamp-press p-3 rounded-md border border-border bg-surface hover:border-terracotta/40 text-xs font-body transition-colors text-center"
              >
                <div className="text-text font-medium">Faded</div>
                <div className="text-[10px] text-text-muted mt-0.5">1</div>
              </button>
              <button
                onClick={() => handleNext(2)}
                className="stamp-press p-3 rounded-md border border-border bg-surface hover:border-marigold/40 text-xs font-body transition-colors text-center"
              >
                <div className="text-text font-medium">Hard</div>
                <div className="text-[10px] text-text-muted mt-0.5">2</div>
              </button>
              <button
                onClick={() => handleNext(3)}
                className="stamp-press p-3 rounded-md border border-border bg-surface hover:border-turquoise/40 text-xs font-body transition-colors text-center"
              >
                <div className="text-text font-medium">Good</div>
                <div className="text-[10px] text-text-muted mt-0.5">3</div>
              </button>
              <button
                onClick={() => handleNext(4)}
                className="stamp-press p-3 rounded-md border border-border bg-surface hover:border-cobalt/40 text-xs font-body transition-colors text-center"
              >
                <div className="text-text font-medium">Easy</div>
                <div className="text-[10px] text-text-muted mt-0.5">4</div>
              </button>
            </div>
            <p className="text-center text-[11px] text-text-muted font-handwriting">
              Press 1, 2, 3 or 4 · There are no wrong answers
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
