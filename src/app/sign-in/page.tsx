"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";

export function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if testing a fresh Google account
  const isFreshParam = searchParams.get("fresh") === "true";

  const handleSignIn = async (provider: "google" | "email", isFresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          email: provider === "email" ? email : undefined,
          isFresh: isFresh || isFreshParam,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign in");
      }

      const data = await res.json();

      // After sign-in: go straight to onboarding (first time) or Today (returning user)
      if (!data.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 sm:p-6 font-body">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <span className="font-heading text-2xl tracking-tight text-text">
            You Inc.
          </span>
          <h1 className="font-heading text-xl sm:text-2xl text-text font-normal pt-1">
            Sign in to your notebook
          </h1>
          <p className="text-xs text-text-muted">
            A calm journal for your degree. Show up for a few minutes.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Main Option: Continue with Google */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSignIn("google", isFreshParam)}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded border border-border bg-paper hover:bg-paper-sunken text-text font-body text-sm font-medium transition-colors shadow-2xs hover:border-cobalt/40 focus:outline-none focus:ring-1 focus:ring-cobalt cursor-pointer"
          >
            {/* Google G icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          {/* Fresh account quick test button */}
          <div className="text-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSignIn("google", true)}
              className="text-[11px] text-cobalt hover:underline transition-colors"
            >
              Or sign up with a fresh Google account
            </button>
          </div>

          {/* Divider: or */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/80" />
            </div>
            <div className="relative bg-surface px-3 text-xs text-text-muted">
              or
            </div>
          </div>

          {/* Secondary Option: Email */}
          {!showEmailInput ? (
            <button
              type="button"
              onClick={() => setShowEmailInput(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-border/60 bg-transparent hover:bg-paper text-text-muted hover:text-text font-body text-xs transition-colors"
            >
              <Mail size={14} />
              <span>Continue with email</span>
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) handleSignIn("email");
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-border bg-paper px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:border-cobalt focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-body text-xs font-medium hover:bg-cobalt/90 transition-colors disabled:opacity-50"
              >
                <span>{loading ? "Signing in..." : "Continue with email"}</span>
                <ArrowRight size={12} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-xs text-text-muted">
          Loading sign in...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
