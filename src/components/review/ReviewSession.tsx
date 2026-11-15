"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  BookOpen,
  WifiOff,
  TrendingUp,
  Brain,
  Layers,
  ChevronRight,
} from "lucide-react";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { CornerOrnament } from "@/components/motifs/CornerOrnament";
import { InkStampSeal } from "./InkStampSeal";
import { BlindSpotDisplay } from "./BlindSpotDisplay";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { CardType } from "@prisma/client";

export interface ReviewCardItem {
  id: string;
  type: CardType;
  front: string;
  back: string;
  stability: number;
  difficulty: number;
  reps: number;
  isKeepFresh?: boolean;
  semesterName?: string;
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
  sourceSlide?: {
    id: string;
    number: number;
    deckId: string;
  } | null;
}

interface ReviewSessionProps {
  initialQueue?: ReviewCardItem[];
  subjects?: { id: string; name: string; code: string }[];
  initialMode?: string;
  initialSubjectId?: string;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({
  initialQueue = [],
  subjects = [],
  initialMode = "all",
  initialSubjectId = "",
}) => {
  const { success, error: toastError, info } = useToast();

  const [queue, setQueue] = useState<ReviewCardItem[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [loadingQueue, setLoadingQueue] = useState<boolean>(initialQueue.length === 0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Queue Filters
  const [selectedMode, setSelectedMode] = useState<string>(initialMode);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);

  // AI Check state
  const [aiChecking, setAiChecking] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<{
    suggestedGrade: number;
    gradeLabel: string;
    feedback: string;
    coveragePercent: number;
  } | null>(null);

  // Post-card feedback indicator
  const [lastFeedback, setLastFeedback] = useState<{
    conceptName: string;
    delta: number;
    grade?: number;
  } | null>(null);

  // Session summary metrics
  const [reviewedHistory, setReviewedHistory] = useState<
    { cardId: string; grade: number; conceptName: string; conceptId: string; delta: number }[]
  >([]);
  const [isSessionFinished, setIsSessionFinished] = useState<boolean>(false);

  // Offline queue status
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [pendingOfflineReviews, setPendingOfflineReviews] = useState<number>(0);

  // 1-tap pre-session confidence check
  const [confidenceCandidate, setConfidenceCandidate] = useState<{
    conceptId: string;
    conceptName: string;
    subjectName: string;
    subjectCode: string;
  } | null>(null);
  const [confidenceAnswered, setConfidenceAnswered] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/review/confidence")
      .then((res) => res.json())
      .then((data) => {
        if (data?.candidate) {
          setConfidenceCandidate(data.candidate);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleRecordConfidence = async (level: "not_sure" | "fairly_sure" | "very_sure" | "skip") => {
    if (level !== "skip" && confidenceCandidate) {
      try {
        await fetch("/api/review/confidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conceptId: confidenceCandidate.conceptId,
            confidence: level,
          }),
        });
      } catch (err) {
        console.error("Error saving confidence:", err);
      }
    }
    setConfidenceAnswered(true);
  };

  const handleStart3MinuteFix = async (cardIds: string[]) => {
    if (!cardIds || cardIds.length === 0) return;
    try {
      const res = await fetch(`/api/review/queue?cardIds=${cardIds.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        if (data.cards && data.cards.length > 0) {
          setQueue(data.cards);
          setCurrentIndex(0);
          setIsRevealed(false);
          setTypedAnswer("");
          setIsSessionFinished(false);
        }
      }
    } catch (e) {
      console.error("Error starting 3-minute fix:", e);
    }
  };

  // Focus textarea ref
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch queue from API
  const fetchQueue = useCallback(
    async (mode = selectedMode, subjId = selectedSubjectId) => {
      setLoadingQueue(true);
      try {
        const params = new URLSearchParams();
        if (mode) params.set("mode", mode);
        if (subjId) params.set("subjectId", subjId);

        const res = await fetch(`/api/review/queue?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load queue");
        const data = await res.json();
        setQueue(data.cards || []);
        setCurrentIndex(0);
        setIsRevealed(false);
        setTypedAnswer("");
        setAiFeedback(null);
        setIsSessionFinished(false);
      } catch (err: unknown) {
        toastError("Something went wrong. Try again.");
      } finally {
        setLoadingQueue(false);
      }
    },
    [selectedMode, selectedSubjectId, toastError]
  );

  // Initial load
  useEffect(() => {
    if (initialQueue.length === 0) {
      fetchQueue();
    }
  }, [fetchQueue, initialQueue.length]);

  // Offline network status tracking & auto-sync
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(
        navigator.userAgent || navigator.platform || ""
      )
    ) {
      setModKey("⌘");
    }
  }, []);

  const syncOfflineReviews = useCallback(async () => {
    try {
      const stored = localStorage.getItem("youinc_offline_reviews");
      if (!stored) return;
      const offlineQueue: { cardId: string; grade: number; timestamp: string }[] = JSON.parse(stored);
      if (!Array.isArray(offlineQueue) || offlineQueue.length === 0) return;

      info(`Saving ${offlineQueue.length} offline reviews...`);

      for (const item of offlineQueue) {
        await fetch("/api/review/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }

      localStorage.removeItem("youinc_offline_reviews");
      setPendingOfflineReviews(0);
      success("All offline reviews successfully synchronized!");
    } catch (err: unknown) {
      console.error("Offline sync error:", err);
    }
  }, [info, success]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineReviews();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check on mount
    const stored = localStorage.getItem("youinc_offline_reviews");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingOfflineReviews(parsed.length || 0);
        if (navigator.onLine && parsed.length > 0) {
          syncOfflineReviews();
        }
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineReviews]);

  const currentCard = queue[currentIndex];
  const isEssayType = currentCard && (currentCard.type === "APPLICATION" || currentCard.type === "THREE_POINTS");

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if student is typing in an input/textarea unless it is Enter/Ctrl+Enter
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (!isRevealed) {
        if (e.code === "Space" && !isInput) {
          e.preventDefault();
          setIsRevealed(true);
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          setIsRevealed(true);
        }
      } else {
        if (["1", "2", "3", "4"].includes(e.key) && !isInput) {
          e.preventDefault();
          handleGrade(parseInt(e.key, 10));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealed, currentCard]);

  // Handle grade submission
  const handleGrade = async (grade: number) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);

    // If offline, save in localStorage
    if (!navigator.onLine) {
      const stored = localStorage.getItem("youinc_offline_reviews");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        cardId: currentCard.id,
        grade,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("youinc_offline_reviews", JSON.stringify(list));
      setPendingOfflineReviews(list.length);

      const estimatedDelta = grade >= 3 ? 3.5 : -1.0;
      setLastFeedback({
        conceptName: currentCard.concept.name,
        delta: estimatedDelta,
        grade,
      });

      setReviewedHistory((prev) => [
        ...prev,
        {
          cardId: currentCard.id,
          grade,
          conceptName: currentCard.concept.name,
          conceptId: currentCard.concept.id,
          delta: estimatedDelta,
        },
      ]);

      advanceCard();
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          grade,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record review");

      setLastFeedback({
        conceptName: currentCard.concept.name,
        delta: data.valueDelta || 0,
        grade,
      });

      setReviewedHistory((prev) => [
        ...prev,
        {
          cardId: currentCard.id,
          grade,
          conceptName: currentCard.concept.name,
          conceptId: currentCard.concept.id,
          delta: data.valueDelta || 0,
        },
      ]);

      advanceCard();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to record review");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceCard = () => {
    setIsRevealed(false);
    setTypedAnswer("");
    setAiFeedback(null);

    if (currentIndex + 1 >= queue.length) {
      setIsSessionFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Run AI rubric evaluation on typed student answer
  const handleAiCheck = async () => {
    if (!typedAnswer.trim() || !currentCard) return;
    setAiChecking(true);
    try {
      const res = await fetch("/api/review/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: currentCard.front,
          modelAnswer: currentCard.back,
          typedAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI check failed");
      setAiFeedback(data);
      setIsRevealed(true);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "AI check failed");
    } finally {
      setAiChecking(false);
    }
  };

  // Session summary calculations
  const totalRecovered = reviewedHistory.reduce((sum, h) => sum + Math.max(0, h.delta), 0);
  const accurateCount = reviewedHistory.filter((h) => h.grade >= 3).length;
  const accuracyPct = reviewedHistory.length > 0 ? Math.round((accurateCount / reviewedHistory.length) * 100) : 0;

  // Weakest concept identification
  const conceptScores: Record<string, { name: string; sumGrade: number; count: number }> = {};
  for (const h of reviewedHistory) {
    if (!conceptScores[h.conceptId]) {
      conceptScores[h.conceptId] = { name: h.conceptName, sumGrade: 0, count: 0 };
    }
    conceptScores[h.conceptId].sumGrade += h.grade;
    conceptScores[h.conceptId].count += 1;
  }
  let weakestConceptName = "";
  let lowestAvg = Infinity;
  for (const cid in conceptScores) {
    const avg = conceptScores[cid].sumGrade / conceptScores[cid].count;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      weakestConceptName = conceptScores[cid].name;
    }
  }

  // Restart session with weak ones
  const restartWeakOnes = () => {
    const weakCardIds = new Set(reviewedHistory.filter((h) => h.grade <= 2).map((h) => h.cardId));
    const weakCards = queue.filter((c) => weakCardIds.has(c.id));
    if (weakCards.length > 0) {
      setQueue(weakCards);
      setCurrentIndex(0);
      setIsRevealed(false);
      setTypedAnswer("");
      setAiFeedback(null);
      setIsSessionFinished(false);
      setReviewedHistory([]);
      info(`Loaded ${weakCards.length} weak cards for targeted drill.`);
    } else {
      fetchQueue("weakest_first");
    }
  };

  // Card Type Badge
  const getCardTypeBadge = (type: CardType) => {
    switch (type) {
      case "APPLICATION":
        return <span className="px-2 py-0.5 rounded bg-turmeric/15 text-turmeric font-mono text-[10px] font-bold">APPLICATION DRILL</span>;
      case "THREE_POINTS":
        return <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-mono text-[10px] font-bold">3-POINT EXECUTIVE</span>;
      case "SPOT_ERROR":
        return <span className="px-2 py-0.5 rounded bg-sindoor/15 text-sindoor font-mono text-[10px] font-bold">SPOT THE ERROR</span>;
      case "FRAMEWORK":
        return <span className="px-2 py-0.5 rounded bg-leaf/15 text-leaf font-body text-xs font-semibold">Framework drill</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-surface border border-border text-text font-body text-xs font-semibold">Topic recall</span>;
    }
  };

  if (loadingQueue) {
    return (
      <div className="p-12 text-center border border-border rounded bg-surface font-body space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-sindoor border-t-transparent rounded-full animate-spin" />
        <h3 className="font-heading text-lg text-text">Loading review cards...</h3>
        <p className="text-xs text-text-muted font-body">
          Finding the cards ready for today&apos;s review.
        </p>
      </div>
    );
  }

  // Session Completed Screen
  if (isSessionFinished || queue.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative p-6 sm:p-8 rounded-lg border-2 border-sindoor/40 bg-surface shadow-md">
          <CornerOrnament position="top-right" size={32} />
          <CornerOrnament position="bottom-left" size={32} />
          <LedgerBorder stroke="#7A3B24" className="opacity-15" />
          <div className="relative z-10 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-leaf/10 text-leaf flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <span className="font-body text-xs text-leaf font-semibold">
                Review session complete
              </span>
              <h2 className="font-heading text-3xl font-normal text-text">
                Memory Strengthened
              </h2>
              <p className="font-body text-xs text-text-muted">
                You have strengthened your recall for class discussions and exams.
              </p>
            </div>

            <OrnamentDivider stroke="#7A3B24" className="opacity-30" />

            {/* Performance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-body">
              <div className="p-3 rounded border border-border bg-bg/50">
                <span className="font-body text-xs text-text-muted">Cards reviewed</span>
                <div className="font-mono text-xl font-bold text-text mt-0.5">
                  {reviewedHistory.length}
                </div>
              </div>

              <div className="p-3 rounded border border-border bg-bg/50">
                <span className="font-body text-xs text-text-muted">Recall accuracy</span>
                <div className="font-mono text-xl font-bold text-leaf mt-0.5">
                  {accuracyPct}%
                </div>
              </div>

              <div className="p-3 rounded border border-border bg-bg/50">
                <span className="font-body text-xs text-text-muted">Strength gained</span>
                <div className="font-mono text-xl font-bold text-sindoor mt-0.5">
                  +{Math.round(totalRecovered)} pts
                </div>
              </div>

              <div className="p-3 rounded border border-border bg-bg/50">
                <span className="font-body text-xs text-text-muted">Needs focus</span>
                <div className="font-heading text-xs font-semibold text-text mt-1 truncate" title={weakestConceptName}>
                  {weakestConceptName || "None"}
                </div>
              </div>
            </div>

            {/* Blind Spots (Self-Check Insights) */}
            <div className="pt-4 text-left">
              <BlindSpotDisplay onStartFix={handleStart3MinuteFix} />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {reviewedHistory.some((h) => h.grade <= 2) && (
                <button
                  onClick={restartWeakOnes}
                  className="px-4 py-2 rounded bg-sindoor text-white text-xs font-body font-medium hover:bg-sindoor-dark transition-colors flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw size={14} />
                  <span>Review weak ones again</span>
                </button>
              )}

              <button
                onClick={() => fetchQueue("all")}
                className="px-4 py-2 rounded border border-border bg-surface text-text text-xs font-body font-medium hover:bg-bg transition-colors"
              >
                Load more cards
              </button>

              <Link
                href="/decks"
                className="px-4 py-2 rounded border border-border bg-surface text-text text-xs font-body font-medium hover:bg-bg transition-colors"
              >
                Upload more decks
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1-tap pre-session question
  if (confidenceCandidate && !confidenceAnswered) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-lg border border-border/80 bg-surface text-center space-y-4 font-body shadow-xs">
        <span className="text-xs font-semibold text-leaf block">
          Quick self-check • {confidenceCandidate.subjectCode}
        </span>
        <h3 className="font-heading text-xl text-text font-normal leading-snug">
          How sure do you feel about &ldquo;{confidenceCandidate.conceptName}&rdquo;?
        </h3>
        <p className="text-xs text-text-muted">
          Takes one tap. Helps calibrate what to focus on later.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleRecordConfidence("not_sure")}
            className="px-3 py-2.5 rounded border border-border/80 bg-bg hover:border-cobalt/60 hover:text-cobalt text-xs font-medium transition-colors text-text"
          >
            Not sure
          </button>
          <button
            type="button"
            onClick={() => handleRecordConfidence("fairly_sure")}
            className="px-3 py-2.5 rounded border border-border/80 bg-bg hover:border-cobalt/60 hover:text-cobalt text-xs font-medium transition-colors text-text"
          >
            Fairly sure
          </button>
          <button
            type="button"
            onClick={() => handleRecordConfidence("very_sure")}
            className="px-3 py-2.5 rounded border border-border/80 bg-bg hover:border-cobalt/60 hover:text-cobalt text-xs font-medium transition-colors text-text"
          >
            Very sure
          </button>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleRecordConfidence("skip")}
            className="text-xs text-text-muted hover:text-text transition-colors underline underline-offset-2"
          >
            Skip for now →
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / queue.length) * 100);

  return (
    <div className="space-y-6">
      {/* Controls & Queue Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded border border-border bg-surface text-xs font-body">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-body text-xs text-text-muted">
            <span className="font-semibold text-text font-mono">Card {currentIndex + 1}</span> of {queue.length}
          </div>

          <div className="w-32 sm:w-48 bg-border/40 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cobalt h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {isOffline && (
            <span className="px-2 py-0.5 rounded bg-sindoor/10 text-sindoor font-body text-xs flex items-center gap-1 border border-sindoor/30">
              <WifiOff size={11} />
              Offline reviews saved ({pendingOfflineReviews} waiting)
            </span>
          )}
        </div>

        {/* Queue Mode Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMode}
            onChange={(e) => {
              setSelectedMode(e.target.value);
              fetchQueue(e.target.value, selectedSubjectId);
            }}
            className="px-2.5 py-1 rounded bg-surface border border-border text-text font-body text-xs focus:outline-none focus:border-sindoor"
          >
            <option value="all">All cards waiting</option>
            <option value="weakest_first">Weakest first</option>
            <option value="exam_mode">Exam focus (&gt;20% Syllabus Weight)</option>
          </select>

          {subjects.length > 0 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                fetchQueue(selectedMode, e.target.value);
              }}
              className="px-2.5 py-1 rounded bg-surface border border-border text-text font-body text-xs focus:outline-none focus:border-sindoor"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Floating Indicator for Value Recovered & Settle Ink Stamp */}
      {lastFeedback && (
        <div className="flex items-center justify-between p-2 rounded bg-leaf/10 border border-leaf/30 text-leaf font-body text-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            <span>
              Topic strengthened: <strong>{lastFeedback.conceptName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold">
              {lastFeedback.delta >= 0 ? `+${lastFeedback.delta.toFixed(1)} pts` : `${lastFeedback.delta.toFixed(1)} pts`}
            </span>
            {lastFeedback.delta >= 0 && (
              <InkStampSeal
                grade={lastFeedback.grade}
                delta={lastFeedback.delta}
                className="scale-75 -my-4 -mr-2"
              />
            )}
          </div>
        </div>
      )}

      {/* Active Card Surface with 3D Flip */}
      <motion.div
        key={currentCard.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative p-6 sm:p-8 rounded-lg border-2 border-border bg-surface shadow-md"
        style={{ perspective: 1200 }}
      >
        <LedgerBorder stroke="#7A3B24" className="opacity-15" />

        <div className="relative z-10 space-y-6">
          {/* Card Top Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-turmeric/10 text-turmeric border border-turmeric/20">
                {currentCard.concept.subject.code}
              </span>
              <span className="font-heading text-sm text-text font-medium">
                {currentCard.concept.name}
              </span>
              {getCardTypeBadge(currentCard.type)}
              {currentCard.isKeepFresh && (
                <span className="font-body text-xs font-medium px-2 py-0.5 rounded-full bg-haldi/15 text-haldi border border-haldi/30 whitespace-nowrap">
                  Keep fresh · {currentCard.semesterName || "Past Semester"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 font-body text-xs text-text-muted">
              <span>Strength: {Math.round(currentCard.concept.value)}%</span>
              {currentCard.sourceSlide && (
                <span>Slide #{currentCard.sourceSlide.number}</span>
              )}
            </div>
          </div>

          {/* Front Prompt */}
          <div className="space-y-3">
            <span className="font-body text-xs font-semibold text-sindoor">
              Prompt & Exercise
            </span>
            <div className="font-heading text-xl sm:text-2xl text-text leading-relaxed font-normal">
              {currentCard.front}
            </div>
          </div>

          {/* Essay or Typed Answer Section */}
          {isEssayType && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs font-body text-text-muted">
                <span>Executive Articulation Drill (Type Answer First)</span>
                <span className="text-xs">{modKey}+Enter to check</span>
              </div>
              <textarea
                ref={textareaRef}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your strategic rationale or 3-point explanation here before revealing..."
                rows={3}
                disabled={isRevealed}
                className="w-full p-3 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
              />

              {!isRevealed && typedAnswer.trim().length > 0 && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleAiCheck}
                    disabled={aiChecking}
                    className="px-3 py-1.5 rounded bg-turmeric/15 border border-turmeric/40 text-turmeric font-body text-xs font-medium hover:bg-turmeric/25 transition-colors flex items-center gap-1.5 active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <Sparkles size={13} />
                    <span className="whitespace-nowrap">{aiChecking ? "Checking your answer..." : "Check my answer"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Rubric Feedback */}
          {aiFeedback && (
            <div className="p-3 rounded border border-turmeric/40 bg-turmeric/10 space-y-1.5 text-xs font-body animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-body text-xs">
                <span className="font-semibold text-turmeric flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Feedback: {aiFeedback.gradeLabel} ({aiFeedback.coveragePercent}% Coverage)
                </span>
                <span className="text-text-muted">Suggested Grade: {aiFeedback.suggestedGrade}</span>
              </div>
              <p className="text-text leading-relaxed">{aiFeedback.feedback}</p>
            </div>
          )}

          {/* Answer Model (Revealed) with 3D Flip Settle */}
          {isRevealed ? (
            <motion.div
              initial={{ rotateX: -22, opacity: 0, y: -8 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className="space-y-3 pt-4 border-t border-border"
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold text-leaf">
                  Example Answer
                </span>
                <span className="font-body text-xs text-text-muted">
                  Compare against your reasoning
                </span>
              </div>

              <div className="p-4 rounded border border-leaf/30 bg-leaf/5 font-body text-base text-text leading-relaxed whitespace-pre-wrap">
                {currentCard.back}
              </div>
            </motion.div>
          ) : (
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => setIsRevealed(true)}
                className="px-6 py-2.5 rounded bg-cobalt text-white dark:text-[#1A1714] text-sm font-body font-medium hover:bg-cobalt/90 transition-all active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap min-w-[150px] justify-center shrink-0"
              >
                <span className="whitespace-nowrap">Reveal Answer</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-body whitespace-nowrap">Space</span>
              </button>
            </div>
          )}

          <OrnamentDivider stroke="#7A3B24" className="opacity-20" />

          {/* FSRS Grading Bar (Visible Once Revealed) */}
          {isRevealed && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-body text-text-muted">
                <span>How well did you remember this?</span>
                <span className="text-xs">Press keys 1, 2, 3, or 4</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleGrade(1)}
                  disabled={submitting}
                  className="p-3 rounded border border-sindoor/40 bg-sindoor/10 hover:bg-sindoor/20 text-sindoor text-left transition-colors flex flex-col justify-between gap-1 group whitespace-nowrap shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-semibold whitespace-nowrap">Again</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-sindoor/20 font-bold">1</span>
                  </div>
                  <span className="text-xs font-body text-text-muted group-hover:text-text whitespace-nowrap">
                    Lapsed / Missed
                  </span>
                </button>

                <button
                  onClick={() => handleGrade(2)}
                  disabled={submitting}
                  className="p-3 rounded border border-turmeric/40 bg-turmeric/10 hover:bg-turmeric/20 text-turmeric text-left transition-colors flex flex-col justify-between gap-1 group whitespace-nowrap shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-semibold whitespace-nowrap">Hard</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-turmeric/20 font-bold">2</span>
                  </div>
                  <span className="text-xs font-body text-text-muted group-hover:text-text whitespace-nowrap">
                    Hesitant / Partial
                  </span>
                </button>

                <button
                  onClick={() => handleGrade(3)}
                  disabled={submitting}
                  className="p-3 rounded border border-leaf/40 bg-leaf/10 hover:bg-leaf/20 text-leaf text-left transition-colors flex flex-col justify-between gap-1 group whitespace-nowrap shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-semibold whitespace-nowrap">Good</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-leaf/20 font-bold">3</span>
                  </div>
                  <span className="text-xs font-body text-text-muted group-hover:text-text whitespace-nowrap">
                    Accurate Recall
                  </span>
                </button>

                <button
                  onClick={() => handleGrade(4)}
                  disabled={submitting}
                  className="p-3 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-left transition-colors flex flex-col justify-between gap-1 group whitespace-nowrap shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-semibold whitespace-nowrap">Easy</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/20 font-bold">4</span>
                  </div>
                  <span className="text-xs font-body text-text-muted group-hover:text-text whitespace-nowrap">
                    Instant Mastery
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
