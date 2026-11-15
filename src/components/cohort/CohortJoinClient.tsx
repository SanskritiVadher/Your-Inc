"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, BookOpen, Clock, Check, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CohortJoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<{
    cohortName: string;
    prefilledEntriesCount: number;
  } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setJoining(true);
      setError(null);
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          inviteCode: inviteCode.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to join cohort");
      }

      const json = await res.json();
      setJoinResult({
        cohortName: json.cohort.name,
        prefilledEntriesCount: json.prefilledEntriesCount,
      });
    } catch (err: unknown) {
      setError("Something went wrong. Try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-border bg-paper-sunken p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Class Setup
            </span>
            <span className="font-body text-xs text-text-muted">&lt;3 Min Quick Start</span>
          </div>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Join Your Class
          </h1>
          <p className="text-xs text-text-muted font-body mt-1 leading-relaxed">
            Joining with your class code pre-fills your subjects, class schedule, and
            shared lecture library automatically.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta font-mono text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {!joinResult ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase mb-1">
                Class Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. SEC-A26"
                className="w-full bg-paper border border-border p-3 font-mono text-base text-text uppercase tracking-widest focus:outline-none focus:border-leaf"
              />
            </div>

            <div className="p-3 bg-paper border border-border text-[11px] font-mono text-text-muted space-y-1">
              <div>✓ Course subjects pre-populated</div>
              <div>✓ Shared schedule saved</div>
              <div>✓ First review ready in under 3 minutes</div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={joining || !inviteCode.trim()}
              className="w-full font-mono text-xs flex items-center justify-center gap-2 py-3"
            >
              <Users size={15} />
              {joining ? "Joining Class..." : "Join Class"}
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="p-4 bg-leaf/10 border border-leaf/30 text-text space-y-2">
              <div className="flex items-center gap-2 text-leaf font-mono text-xs font-bold uppercase">
                <Check size={16} /> Welcome to {joinResult.cohortName}
              </div>
              <p className="text-xs font-body text-text leading-relaxed">
                Your notebook has been updated with {joinResult.prefilledEntriesCount} class
                schedule blocks and subjects.
              </p>
            </div>

            <div className="p-3 bg-paper border border-border font-mono text-xs flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-1.5">
                <Clock size={13} className="text-leaf" /> Time to First Review:
              </span>
              <span className="font-bold text-text">Now Ready (&lt;1 min)</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/review")}
              className="w-full font-mono text-xs flex items-center justify-center gap-2 py-3"
            >
              <BookOpen size={15} /> Launch First Review Sprint &rarr;
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
