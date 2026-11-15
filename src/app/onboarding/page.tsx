"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [program, setProgram] = useState("MBA");
  const [specialization, setSpecialization] = useState("");
  const [semester, setSemester] = useState("1");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill name from Google / signed-in user on mount
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/current");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name) {
            setName(data.user.name);
          }
        }
      } catch (err) {
        // Fallback default
      }
    }
    loadCurrentUser();
  }, []);

  const handleAddSubject = () => {
    const trimmed = subjectInput.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSubjectInput("");
    }
  };

  const handleRemoveSubject = (indexToRemove: number) => {
    setSubjects(subjects.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async (skipSubjects = false) => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Student",
          program,
          specialization: specialization.trim() || undefined,
          semester: Number(semester) || 1,
          currentTerm: `Semester ${semester}`,
          subjects: skipSubjects ? [] : subjects,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete setup");
      }

      // After Start → Today page with one action: "Upload your first class deck"
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 sm:p-6 font-body">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="font-heading text-2xl tracking-tight text-text">
            You Inc.
          </span>
          <h1 className="font-heading text-xl sm:text-2xl text-text font-normal pt-1">
            Welcome to your study notebook
          </h1>
          <p className="text-xs text-text-muted">
            Set up your profile in under 30 seconds.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs rounded">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          className="space-y-4"
        >
          {/* 1. Name: pre-filled from Google, editable */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sanskriti Vadher"
              className="w-full rounded border border-border bg-paper px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-cobalt focus:outline-none"
            />
          </div>

          {/* 2. Program & Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Program
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full rounded border border-border bg-paper px-3 py-2 text-sm text-text focus:border-cobalt focus:outline-none"
              >
                <option value="MBA">MBA</option>
                <option value="PGDM">PGDM</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Specialization <span className="text-text-muted/70">(optional)</span>
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Finance, Marketing"
                className="w-full rounded border border-border bg-paper px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-cobalt focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Current semester: dropdown (1–6) */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Current semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded border border-border bg-paper px-3 py-2 text-sm text-text focus:border-cobalt focus:outline-none"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
            </select>
          </div>

          {/* 4. Subjects: type a name + Enter to add as a chip (optional) */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Subjects <span className="text-text-muted/70">(optional — you can add these later)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="Type a subject name and press Enter"
                className="flex-1 rounded border border-border bg-paper px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-cobalt focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-3 py-2 rounded border border-border bg-paper hover:bg-paper-sunken text-text-muted hover:text-text text-xs flex items-center gap-1 transition-colors"
                title="Add subject"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {/* Subject Chips */}
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {subjects.map((subj, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cobalt/10 border border-cobalt/25 text-cobalt text-xs font-medium"
                  >
                    <span>{subj}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      className="hover:text-terracotta text-cobalt/70 transition-colors p-0.5"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 5. One button: "Start". Under it, a small "Skip for now" link */}
          <div className="pt-3 text-center space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded bg-cobalt text-white dark:text-[#1A1714] font-medium text-sm hover:bg-cobalt/90 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Setting up..." : "Start"}
            </button>

            <div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(true)}
                className="text-xs text-text-muted hover:text-text hover:underline transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
