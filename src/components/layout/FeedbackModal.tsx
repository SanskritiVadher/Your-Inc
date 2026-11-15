"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, AlertCircle, Check, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExamSurvey, setIsExamSurvey] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"BUG" | "FEATURE" | "CONFUSING" | "PRAISE" | "EXAM_SURVEY">("BUG");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check on mount if student reached 3 reviews and needs the exam survey prompt
  useEffect(() => {
    async function checkSurvey() {
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const json = await res.json();
          if (json.shouldPrompt) {
            setIsExamSurvey(true);
            setFeedbackType("EXAM_SURVEY");
            setIsOpen(true);
          }
        }
      } catch (e) {
        // non-blocking
      }
    }
    checkSurvey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          content: content.trim(),
          contextUrl: window.location.pathname,
          browser: navigator.userAgent.slice(0, 100),
        }),
      });

      if (!res.ok) throw new Error("Failed to send feedback");
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setContent("");
        setIsExamSurvey(false);
      }, 2000);
    } catch (e) {
      alert("Error submitting feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Listen for trigger from MoreMenu or anywhere in the app
  useEffect(() => {
    const handleOpen = () => {
      setIsExamSurvey(false);
      setFeedbackType("BUG");
      setIsOpen(true);
    };
    window.addEventListener("open-feedback-modal", handleOpen);
    return () => window.removeEventListener("open-feedback-modal", handleOpen);
  }, []);

  return (
    <>
      {/* Modal Dialog (Triggered via MoreMenu or exam survey trigger; no floating button) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-body text-xs text-primary font-medium">
                  {isExamSurvey ? "Pilot Survey" : "Feedback"}
                </span>
                <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                  {isExamSurvey ? "What would make you open this before an exam?" : "Report a Problem or Suggestion"}
                </h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text p-1">
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="p-4 bg-primary/10 border border-primary/30 text-primary font-body text-xs text-center flex items-center justify-center gap-2">
                <Check size={16} /> Thank you! Your feedback has been received.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 font-body text-xs">
                {!isExamSurvey && (
                  <div>
                    <label className="block text-text-muted mb-1 font-body">Category</label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value as any)}
                      className="w-full bg-paper border border-border p-2 text-text font-body text-xs rounded"
                    >
                      <option value="BUG">Problem / Issue</option>
                      <option value="CONFUSING">Confusing UI / Label</option>
                      <option value="FEATURE">Feature Suggestion</option>
                      <option value="PRAISE">Praise</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-text-muted mb-1">
                    {isExamSurvey
                      ? "Be completely honest — what feature or format would make this indispensable the night before an exam?"
                      : "Describe what happened or what you need *"}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      isExamSurvey
                        ? "e.g., 'If it had 1-page formula summaries for corporate finance exams...' or 'If the slide jump was 1 click faster...'"
                        : "Describe the issue or suggestion..."
                    }
                    className="w-full bg-paper border border-border p-2.5 font-body text-xs text-text focus:outline-none focus:border-leaf leading-relaxed"
                  />
                </div>

                <div className="p-2.5 bg-paper-sunken border border-border text-[10px] text-text-muted">
                  Auto-attached context: Page URL and browser version. Zero personal notes, answers, or locations are ever sent.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !content.trim()}
                  >
                    {submitting ? "Sending..." : "Submit Feedback"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
