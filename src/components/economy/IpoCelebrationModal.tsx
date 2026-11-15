"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Bell, Share2, Check, Download, X } from "lucide-react";

interface IpoCelebrationModalProps {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sharePrice: number;
  companyName?: string;
  onClose: () => void;
}

export const IpoCelebrationModal: React.FC<IpoCelebrationModalProps> = ({
  subjectId,
  subjectCode,
  subjectName,
  sharePrice,
  companyName = "You Inc.",
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const audioPlayedRef = useRef(false);

  // Play pleasant bronze bell chime via Web Audio API once
  useEffect(() => {
    if (audioPlayedRef.current) return;
    audioPlayedRef.current = true;

    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Fundamental Bell Frequency (approx ~523Hz C5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 1.8);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.0);
    } catch {
      // Audio playback fails silently if user has not interacted or WebAudio disabled
    }
  }, []);

  const shareText = `🎓 Milestone Unlocked at ${companyName}: ${subjectCode} (${subjectName}) has officially crossed ₹${sharePrice.toFixed(2)} book value and achieved Initial Public Offering (IPO) status on our sovereign learning ledger! #YouInc #MBA #LifelongLearning`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-turmeric rounded-xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 font-body">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Bell & Motif Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-turmeric/20 border-2 border-turmeric flex items-center justify-center text-turmeric shadow-inner">
            <Bell className="w-7 h-7 animate-bounce motion-reduce:animate-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded bg-turmeric/20 text-turmeric">
              Initial Public Offering (IPO) Event
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl text-text leading-tight">
            The Bell Has Rung.
          </h2>

          <p className="text-xs sm:text-sm text-text-muted max-w-md">
            Subject <strong>{subjectName}</strong> ({subjectCode}) has crossed the 80.0 mastery threshold, achieving strong curriculum maturity.
          </p>
        </div>

        {/* Mithila Styled Certificate Card */}
        <div className="my-5 p-4 rounded-lg bg-bg border-2 border-border/80 relative overflow-hidden shadow-sm">
          {/* Decorative Corner Kachni Motif */}
          <div className="absolute top-2 right-2 opacity-15 pointer-events-none">
            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-text">
              <path d="M10 90 Q 50 10 90 90 T 10 90" strokeWidth="2" />
              <circle cx="50" cy="50" r="30" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M50 20 L50 80 M20 50 L80 50" strokeWidth="1" />
            </svg>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center text-xs font-mono text-text-muted border-b border-border/60 pb-2">
              <span>{companyName} Registry</span>
              <span>Subject Milestone</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-mono text-text-muted uppercase block">Department Asset</span>
                <span className="font-heading text-2xl text-text font-bold">{subjectCode}</span>
                <span className="text-xs text-text-muted font-body block">{subjectName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-text-muted uppercase block">Closing Share Price</span>
                <span className="font-heading text-3xl text-leaf font-bold">₹{sharePrice.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-leaf block font-bold">Solvency Prime</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>Status: Public Chartered Asset</span>
              <span>Verified Course Mastery</span>
            </div>
          </div>
        </div>

        {/* Share & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyShare}
            className="w-full sm:w-auto px-4 py-2 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-leaf" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-turmeric" />
                <span>Share Milestone (LinkedIn / WhatsApp)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded bg-turmeric hover:bg-turmeric/90 text-bg font-mono text-xs font-bold transition-colors shadow-xs"
          >
            Accept Charter &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
};
