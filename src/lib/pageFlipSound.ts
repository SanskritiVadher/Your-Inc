/**
 * Real Recorded Page-Turn Sound Utility.
 *
 * - Preloads 3 real recorded CC0 book page turns (processed .mp3 / .ogg under 40 KB).
 * - Zero-latency playback via Web Audio API AudioBuffer.
 * - Random sample selection per flip with ±3% pitch and ±10% volume variation.
 * - Base volume calibrated around 30% (0.30).
 * - Mute toggle remembered in localStorage ('pageFlipSoundEnabled').
 * - Respects prefers-reduced-motion (completely silent).
 */

const SOUND_SETS = [
  { mp3: "/sounds/page-flip-1.mp3", ogg: "/sounds/page-flip-1.ogg" },
  { mp3: "/sounds/page-flip-2.mp3", ogg: "/sounds/page-flip-2.ogg" },
  { mp3: "/sounds/page-flip-3.mp3", ogg: "/sounds/page-flip-3.ogg" },
];

let audioBuffers: AudioBuffer[] = [];
let audioContext: AudioContext | null = null;
let preloaded = false;
let isPreloading = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new AudioCtx();
  }
  return audioContext;
}

export async function preloadSounds(): Promise<void> {
  if (preloaded || isPreloading || typeof window === "undefined") return;
  isPreloading = true;

  try {
    const ctx = getAudioContext();
    const canPlayOgg =
      typeof Audio !== "undefined" &&
      new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== "";

    const buffers = await Promise.all(
      SOUND_SETS.map(async (set) => {
        // Prefer ogg where supported, otherwise mp3
        const primaryUrl = canPlayOgg ? set.ogg : set.mp3;
        const fallbackUrl = canPlayOgg ? set.mp3 : set.ogg;

        try {
          const res = await fetch(primaryUrl);
          const arrayBuf = await res.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuf);
        } catch {
          // Fallback to secondary format
          const res = await fetch(fallbackUrl);
          const arrayBuf = await res.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuf);
        }
      })
    );

    audioBuffers = buffers.filter(Boolean);
    preloaded = audioBuffers.length > 0;
  } catch {
    // Sound is a non-blocking enhancement
    audioBuffers = [];
  } finally {
    isPreloading = false;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("pageFlipSoundEnabled");
  // Default ON in book mode
  return stored === null ? true : stored === "true";
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  if (typeof window !== "undefined") {
    localStorage.setItem("pageFlipSoundEnabled", String(next));
  }
  return next;
}

export interface PlayFlipOptions {
  /** Softer paper rustle (e.g. on slow drag release) */
  soft?: boolean;
}

export async function playFlipSound(options: PlayFlipOptions = {}) {
  if (typeof window === "undefined") return;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReduced) return;

  if (!isSoundEnabled()) return;

  // If not yet preloaded, preload now
  if (!preloaded && !isPreloading) {
    await preloadSounds();
  }
  if (audioBuffers.length === 0) return;

  try {
    const ctx = getAudioContext();

    // Resume if suspended (browser autoplay restrictions)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Pick one of the samples at random
    const buffer =
      audioBuffers[Math.floor(Math.random() * audioBuffers.length)];

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Tiny random pitch variation: ±3% (0.97 - 1.03)
    const pitchVariation = 0.97 + Math.random() * 0.06;
    source.playbackRate.value = pitchVariation;

    // Base volume around 30% (0.30) with tiny ±10% variation (0.27 - 0.33)
    // If soft (slow drag rustle), scale down slightly to ~0.24
    const baseVol = options.soft ? 0.24 : 0.30;
    const volumeVariation = baseVol * (0.90 + Math.random() * 0.20);

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0.01, Math.min(1.0, volumeVariation));

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  } catch {
    // Non-blocking fail
  }
}

// Preload as soon as user first interacts with the document
if (typeof window !== "undefined") {
  const earlyPreload = () => {
    preloadSounds();
    window.removeEventListener("pointerdown", earlyPreload);
    window.removeEventListener("click", earlyPreload);
    window.removeEventListener("keydown", earlyPreload);
  };
  window.addEventListener("pointerdown", earlyPreload, { once: true });
  window.addEventListener("click", earlyPreload, { once: true });
  window.addEventListener("keydown", earlyPreload, { once: true });
}
