"use client";

import { useEffect, useState } from "react";

const MOTIFS_SESSION_KEY = "you-inc-motifs-animated-session";

export interface MotifDrawAnimationState {
  shouldAnimate: boolean;
  duration: number;
}

/**
 * Ensures Madhubani border and header motifs animate as self-drawing lines (1.2s Kachni style)
 * only on the first view of a session, and respects prefers-reduced-motion.
 */
export function useMotifDrawAnimation(): MotifDrawAnimationState {
  const [state, setState] = useState<MotifDrawAnimationState>({
    shouldAnimate: false,
    duration: 1.2,
  });

  useEffect(() => {
    // 1. Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setState({ shouldAnimate: false, duration: 0 });
      return;
    }

    // 2. Check session storage flag
    try {
      const alreadyAnimated = sessionStorage.getItem(MOTIFS_SESSION_KEY);
      if (!alreadyAnimated) {
        sessionStorage.setItem(MOTIFS_SESSION_KEY, "true");
        setState({ shouldAnimate: true, duration: 1.2 });
      } else {
        setState({ shouldAnimate: false, duration: 0 });
      }
    } catch {
      setState({ shouldAnimate: false, duration: 0 });
    }
  }, []);

  return state;
}
