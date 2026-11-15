"use client";

import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  forwardRef,
} from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import {
  isSoundEnabled,
  toggleSound,
  playFlipSound,
} from "@/lib/pageFlipSound";

// Dynamically import HTMLFlipBook (it accesses window internally)
const HTMLFlipBook = dynamic(() => import("react-pageflip"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[320px] text-xs font-body text-text-muted">
      Opening journal…
    </div>
  ),
}) as any; // react-pageflip types don't export well for dynamic

/* ─────────────── Page wrapper (forwardRef required by StPageFlip) ─────────────── */

interface FlipPageProps {
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
  isCover?: boolean;
  pageLabel?: string;
}

const FlipPage = forwardRef<HTMLDivElement, FlipPageProps>(
  ({ children, pageNumber, totalPages, isCover, pageLabel = "Page" }, ref) => {
    const isOuterLeft = pageNumber !== undefined && pageNumber % 2 !== 0;

    return (
      <div
        ref={ref}
        className="relative w-full h-full overflow-hidden"
        style={{
          // Paper texture background
          background: isCover
            ? "linear-gradient(135deg, #F5E6D0 0%, #E8D5B8 50%, #F0DFC5 100%)"
            : "linear-gradient(180deg, #FBF5E8 0%, #F7ECD8 100%)",
          boxShadow: isCover ? "inset 0 0 40px rgba(0,0,0,0.08)" : "none",
        }}
        role="region"
        aria-label={
          isCover
            ? "Book cover"
            : `${pageLabel} ${pageNumber} of ${totalPages}`
        }
      >
        {/* Madhubani border on cover */}
        {isCover ? (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top border */}
            <div
              className="absolute top-0 left-0 right-0 h-3"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #5B6B2E 0px, #5B6B2E 2px, transparent 2px, transparent 6px, #E3A33B 6px, #E3A33B 8px, transparent 8px, transparent 12px)",
              }}
            />
            {/* Bottom border */}
            <div
              className="absolute bottom-0 left-0 right-0 h-3"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #5B6B2E 0px, #5B6B2E 2px, transparent 2px, transparent 6px, #E3A33B 6px, #E3A33B 8px, transparent 8px, transparent 12px)",
              }}
            />
            {/* Left border */}
            <div
              className="absolute top-3 bottom-3 left-0 w-3"
              style={{
                background:
                  "repeating-linear-gradient(180deg, #C8962E 0px, #C8962E 2px, transparent 2px, transparent 6px, #5B6B2E 6px, #5B6B2E 8px, transparent 8px, transparent 12px)",
              }}
            />
            {/* Right border */}
            <div
              className="absolute top-3 bottom-3 right-0 w-3"
              style={{
                background:
                  "repeating-linear-gradient(180deg, #C8962E 0px, #C8962E 2px, transparent 2px, transparent 6px, #5B6B2E 6px, #5B6B2E 8px, transparent 8px, transparent 12px)",
              }}
            />
          </div>
        ) : (
          /* Inner page: subtle margin line */
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={`absolute ${
                isOuterLeft ? "left-7" : "right-7"
              } top-0 bottom-0 w-[1px] bg-cobalt/10`}
            />
            <div className="absolute top-5 left-7 right-7 h-[1px] bg-border/20" />
          </div>
        )}

        {/* Page content */}
        <div
          className={`relative z-10 w-full h-full ${
            isCover ? "p-6" : "px-8 pt-6 pb-9"
          }`}
        >
          {children}
        </div>

        {/* Page number sits strictly in bottom outer corner of each page */}
        {!isCover && pageNumber !== undefined && (
          <div
            className={`absolute bottom-2.5 ${
              isOuterLeft ? "left-5 text-left" : "right-5 text-right"
            } text-[11px] font-body text-text-muted/60 select-none z-10 pointer-events-none`}
          >
            {pageNumber}
          </div>
        )}
      </div>
    );
  }
);

FlipPage.displayName = "FlipPage";

/* ─────────────── Main PageTurn component ─────────────── */

export interface PageTurnProps {
  /** Array of page content elements. Each child becomes one page. */
  pages: React.ReactNode[];
  /** Called when the user flips to a new page. 0-indexed page number. */
  onPageChange?: (page: number) => void;
  /** Starting page (0-indexed). */
  startPage?: number;
  /** Show cover styling on first and last pages. */
  showCover?: boolean;
  /** Label for pages, e.g. "Page", "Spread", "Note". */
  pageLabel?: string;
  /** Show the prev/next controls and mute button. */
  showControls?: boolean;
  /** Extra class on the outer container. */
  className?: string;
  /** Whether the book is in "book mode" (enables sound by default). */
  isBookMode?: boolean;
  /** Callback to exit book mode */
  onExit?: () => void;
}

export function PageTurn({
  pages,
  onPageChange,
  startPage = 0,
  showCover = true,
  pageLabel = "Page",
  showControls = true,
  className = "",
  isBookMode = true,
  onExit,
}: PageTurnProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(startPage);
  const [soundOn, setSoundOn] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isReduced, setIsReduced] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isDraggingRef = useRef(false);
  const midpointTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSoundTimeRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      setIsReduced(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
      setSoundOn(isSoundEnabled());

      // One-time fading hint
      const seen = localStorage.getItem("pageTurnHintSeen");
      if (!seen) {
        setShowHint(true);
        const timer = setTimeout(() => {
          setShowHint(false);
          try {
            localStorage.setItem("pageTurnHintSeen", "true");
          } catch {}
        }, 4500);
        return () => clearTimeout(timer);
      }

      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const triggerSound = useCallback(
    (soft = false) => {
      if (!isBookMode) return;
      const now = Date.now();
      if (now - lastSoundTimeRef.current < 300) return;
      lastSoundTimeRef.current = now;
      playFlipSound({ soft });
    },
    [isBookMode]
  );

  const handleStateChange = useCallback(
    (e: any) => {
      const state: string = e.data;
      if (state === "user_fold") {
        isDraggingRef.current = true;
        if (midpointTimerRef.current) {
          clearTimeout(midpointTimerRef.current);
          midpointTimerRef.current = null;
        }
      } else if (state === "flipping") {
        if (isDraggingRef.current) {
          // Slow mouse drag was released: play soft paper rustle immediately on release
          isDraggingRef.current = false;
          triggerSound(true);
        } else {
          // Click or keyboard flip: play when page begins to fall (flip midpoint ~350ms)
          if (midpointTimerRef.current) clearTimeout(midpointTimerRef.current);
          midpointTimerRef.current = setTimeout(() => {
            triggerSound(false);
          }, 350);
        }
      } else if (state === "read") {
        isDraggingRef.current = false;
        if (midpointTimerRef.current) {
          clearTimeout(midpointTimerRef.current);
          midpointTimerRef.current = null;
        }
      }
    },
    [triggerSound]
  );

  useEffect(() => {
    return () => {
      if (midpointTimerRef.current) {
        clearTimeout(midpointTimerRef.current);
      }
    };
  }, []);

  const handleFlip = useCallback(
    (e: any) => {
      const pageNum: number = e.data;
      setCurrentPage(pageNum);
      onPageChange?.(pageNum);
    },
    [onPageChange]
  );

  const goNext = useCallback(() => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  }, []);

  const goPrev = useCallback(() => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  const totalPages = pages.length;

  // prefers-reduced-motion: simple paginated view, no flip animation, no sound
  if (isReduced || !mounted) {
    return (
      <div className={`relative ${className}`}>
        {/* Top Minimal Action Bar */}
        <div className="flex items-center justify-end space-x-1 mb-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface/80 transition-colors focus:outline-none"
              title="Exit book view"
              aria-label="Exit book view"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative group">
          <div
            className="min-h-[340px] border border-border/80 rounded bg-surface overflow-hidden shadow-xs"
            style={{
              background:
                "linear-gradient(180deg, #FBF5E8 0%, #F7ECD8 100%)",
            }}
          >
            <div className="p-6">{pages[currentPage] || pages[0]}</div>
          </div>

          {/* Left/Right quiet edge arrows */}
          <button
            type="button"
            onClick={() => {
              const p = Math.max(0, currentPage - 1);
              setCurrentPage(p);
              onPageChange?.(p);
            }}
            disabled={currentPage === 0}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface/90 hover:bg-surface border border-border/50 text-text-muted hover:text-text shadow-sm transition-all disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              const p = Math.min(totalPages - 1, currentPage + 1);
              setCurrentPage(p);
              onPageChange?.(p);
            }}
            disabled={currentPage >= totalPages - 1}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface/90 hover:bg-surface border border-border/50 text-text-muted hover:text-text shadow-sm transition-all disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Page indicator: small "3 / 6" centred under the book, Mukta font, muted ink */}
        <div className="mt-3 text-center font-body text-xs text-text-muted/70 tracking-wide select-none">
          {currentPage + 1} / {totalPages}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Top minimal controls: sound icon and exit book icon at top-right */}
      <div className="flex items-center justify-end space-x-1 mb-2 pr-1">
        {isBookMode && (
          <button
            type="button"
            onClick={handleToggleSound}
            className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface/80 transition-colors focus:outline-none"
            title={soundOn ? "Mute sound" : "Unmute sound"}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface/80 transition-colors focus:outline-none"
            title="Exit book view"
            aria-label="Exit book view"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Book Container with Left/Right hover edge buttons */}
      <div className="relative group flex justify-center items-center">
        {/* Left quiet arrow button */}
        <button
          type="button"
          onClick={goPrev}
          disabled={currentPage === 0}
          className="absolute left-1 md:-left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-surface/90 hover:bg-surface border border-border/50 text-text-muted hover:text-text shadow-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none focus:opacity-100"
          aria-label="Previous page (Left arrow)"
          title="Previous page (Left arrow)"
        >
          <ChevronLeft size={16} />
        </button>

        {/* HTMLFlipBook */}
        <HTMLFlipBook
          ref={flipBookRef}
          width={isMobile ? 340 : 500}
          height={isMobile ? 480 : 640}
          size="stretch"
          minWidth={280}
          maxWidth={700}
          minHeight={400}
          maxHeight={800}
          showCover={showCover}
          flippingTime={700}
          useMouseEvents={true}
          usePortrait={isMobile}
          drawShadow={true}
          maxShadowOpacity={0.25}
          showPageCorners={true}
          mobileScrollSupport={false}
          clickEventForward={true}
          swipeDistance={30}
          startPage={startPage}
          startZIndex={0}
          autoSize={true}
          disableFlipByClick={false}
          onFlip={handleFlip}
          onChangeState={handleStateChange}
          className="book-shadow"
          style={{}}
        >
          {pages.map((pageContent, idx) => {
            const isCover = showCover && (idx === 0 || idx === totalPages - 1);
            return (
              <FlipPage
                key={idx}
                pageNumber={idx + 1}
                totalPages={totalPages}
                isCover={isCover}
                pageLabel={pageLabel}
              >
                {pageContent}
              </FlipPage>
            );
          })}
        </HTMLFlipBook>

        {/* Right quiet arrow button */}
        <button
          type="button"
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          className="absolute right-1 md:-right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-surface/90 hover:bg-surface border border-border/50 text-text-muted hover:text-text shadow-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none focus:opacity-100"
          aria-label="Next page (Right arrow)"
          title="Next page (Right arrow)"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Page indicator: small "3 / 6" centred under the book, Mukta font, muted ink */}
      <div className="mt-3 text-center font-body text-xs text-text-muted/70 tracking-wide select-none">
        {currentPage + 1} / {totalPages}
      </div>

      {/* One-time fading hint */}
      {showHint && (
        <div className="mt-2 text-center transition-opacity duration-1000">
          <span className="inline-block px-3 py-1 rounded-full bg-surface/90 border border-border/40 text-[11px] font-body text-text-muted shadow-2xs animate-pulse">
            Drag corner, click edge, or use arrow keys
          </span>
        </div>
      )}

      <style jsx global>{`
        .book-shadow {
          filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12));
        }
      `}</style>
    </div>
  );
}

export default PageTurn;
