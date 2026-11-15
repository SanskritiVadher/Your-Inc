"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import {
  Sparkles,
  BookOpen,
  Briefcase,
  HelpCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Star,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface TopicToRevise {
  id: string;
  name: string;
  definition: string;
  mastery: number;
  subjectCode: string;
  subjectName: string;
  semesterName: string;
}

interface ProjectToHighlight {
  id: string;
  title: string;
  problem: string;
  role: string;
  tools?: string | null;
  outcome?: string | null;
  metric?: string | null;
  resumeBullet?: string | null;
  starStory: { situation: string; task: string; action: string; result: string };
  isSignature: boolean;
  semesterName: string;
}

interface AnticipatedQuestion {
  id: string;
  question: string;
  contextType: "topic" | "project";
  source: string;
}

interface PrepPackData {
  role: string;
  company: string;
  generatedAt: string;
  topicsToRevise: TopicToRevise[];
  projectsToHighlight: ProjectToHighlight[];
  anticipatedQuestions: AnticipatedQuestion[];
}

interface InterviewPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewPrepModal({ isOpen, onClose }: InterviewPrepModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState("Product Manager");
  const [company, setCompany] = useState("Google");
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [prepPack, setPrepPack] = useState<PrepPackData | null>(null);
  const [activeTab, setActiveTab] = useState<"topics" | "projects" | "questions">("topics");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;

    try {
      setGenerating(true);
      const res = await fetch("/api/career/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to generate prep pack");
      const json = await res.json();
      setPrepPack(json.prepPack);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error generating prep pack");
    } finally {
      setGenerating(false);
    }
  };

  const handleStartMockInterview = () => {
    if (!prepPack) return;
    onClose();
    // Navigate to Career interview room pre-filled
    router.push(
      `/career?tab=interview&role=${encodeURIComponent(prepPack.role)}&company=${encodeURIComponent(
        prepPack.company
      )}`
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={prepPack ? `Interview Prep Pack · ${prepPack.role} at ${prepPack.company}` : "Prepare for an Interview"}
    >
      <div className="space-y-5 text-xs font-body max-h-[75vh] overflow-y-auto pr-1">
        {!prepPack ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <p className="text-text-muted leading-relaxed">
              Synthesise your entire MBA curriculum and project vault across all semesters into a targeted executive interview pack.
              Only real course topics and logged project deliverables will be included.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted mb-1 font-medium">Target Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Product Manager, Management Consultant"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded border border-border bg-bg text-text text-sm focus:outline-none focus:border-cobalt"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 font-medium">Target Company *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, McKinsey, Goldman Sachs"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2.5 rounded border border-border bg-bg text-text text-sm focus:outline-none focus:border-cobalt"
                />
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-1 font-medium">
                Job Description / Mandate Focus (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Paste key responsibilities or qualification keywords from the job listing..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-2.5 rounded border border-border bg-bg text-text text-xs focus:outline-none focus:border-cobalt resize-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded border border-border bg-surface text-text hover:bg-surface-raised transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-medium hover:bg-cobalt/90 transition-colors whitespace-nowrap shadow-xs disabled:opacity-40"
              >
                <Sparkles size={14} />
                <span>{generating ? "Gathering from all semesters..." : "Build Prep Pack"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-leaf/40 bg-leaf/10">
              <div className="space-y-0.5">
                <div className="font-semibold text-text flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-leaf" />
                  <span>Prep Pack Assembled from All Semesters</span>
                </div>
                <div className="text-[11px] text-text-muted">
                  10 Topics to Revise · 3 Projects to Highlight · 10 Likely Questions
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartMockInterview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-medium hover:bg-cobalt/90 transition-colors shadow-xs whitespace-nowrap shrink-0"
              >
                <Play size={13} />
                <span className="whitespace-nowrap">Start Mock Interview</span>
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("topics")}
                className={`flex items-center gap-1.5 px-4 py-2 font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${
                  activeTab === "topics"
                    ? "border-cobalt text-cobalt font-semibold"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <BookOpen size={13} />
                <span>10 Topics to Revise</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-1.5 px-4 py-2 font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${
                  activeTab === "projects"
                    ? "border-cobalt text-cobalt font-semibold"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Briefcase size={13} />
                <span>3 Projects to Highlight</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`flex items-center gap-1.5 px-4 py-2 font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${
                  activeTab === "questions"
                    ? "border-cobalt text-cobalt font-semibold"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <HelpCircle size={13} />
                <span>10 Likely Questions</span>
              </button>
            </div>

            {/* TAB 1: 10 TOPICS TO REVISE */}
            {activeTab === "topics" && (
              <div className="space-y-2.5">
                {prepPack.topicsToRevise.map((top, idx) => (
                  <div
                    key={top.id}
                    className="p-3 rounded border border-border/80 bg-surface/70 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text">
                          {idx + 1}. {top.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-border/40 text-[10px] text-text-muted">
                          {top.subjectCode} · {top.semesterName}
                        </span>
                      </div>
                      <span className="text-haldi font-medium">Mastery: {top.mastery}%</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                      {top.definition}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: 3 PROJECTS TO HIGHLIGHT */}
            {activeTab === "projects" && (
              <div className="space-y-4">
                {prepPack.projectsToHighlight.map((proj, idx) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-lg border border-border/80 bg-surface space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-semibold text-text">
                          {idx + 1}. {proj.title}
                        </span>
                        {proj.isSignature && (
                          <span className="px-1.5 py-0.2 rounded bg-leaf/15 text-leaf text-[10px] font-medium border border-leaf/30 flex items-center gap-1">
                            <Star size={10} className="fill-leaf" />
                            <span>Signature</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-border/40 text-text-muted">
                        {proj.semesterName}
                      </span>
                    </div>

                    {/* Resume Bullet */}
                    {proj.resumeBullet && (
                      <div className="p-2.5 rounded bg-bg border border-border/60 text-xs text-text italic">
                        &ldquo;{proj.resumeBullet}&rdquo;
                      </div>
                    )}

                    {/* STAR Story Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-surface/80 border border-border/50">
                        <strong className="text-text block mb-0.5">Situation & Task:</strong>
                        <span className="text-text-muted">{proj.starStory.situation}</span>
                      </div>
                      <div className="p-2 rounded bg-surface/80 border border-border/50">
                        <strong className="text-text block mb-0.5">Action & Execution:</strong>
                        <span className="text-text-muted">{proj.starStory.action}</span>
                      </div>
                      <div className="p-2 rounded bg-surface/80 border border-border/50 sm:col-span-2">
                        <strong className="text-text block mb-0.5">Verified Result & Metric:</strong>
                        <span className="text-leaf font-medium">{proj.starStory.result}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: 10 LIKELY QUESTIONS */}
            {activeTab === "questions" && (
              <div className="space-y-2.5">
                {prepPack.anticipatedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 rounded border border-border/80 bg-surface/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span className="font-semibold text-cobalt uppercase">Question {idx + 1}</span>
                      <span className="px-1.5 py-0.2 rounded bg-border/30 text-[10px]">
                        Source: {q.source}
                      </span>
                    </div>
                    <p className="text-xs text-text font-medium leading-relaxed">
                      &ldquo;{q.question}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Bottom Buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPrepPack(null)}
                className="text-xs text-cobalt hover:underline"
              >
                &larr; Re-configure role/company
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded border border-border bg-surface text-text hover:bg-surface-raised transition-colors whitespace-nowrap"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartMockInterview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-medium hover:bg-cobalt/90 transition-colors shadow-xs whitespace-nowrap"
                >
                  <Play size={13} />
                  <span>Start Mock Interview</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
