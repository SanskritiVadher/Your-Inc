"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EvaluationEditor } from "@/components/departments/EvaluationEditor";
import { SyllabusUploader } from "@/components/departments/SyllabusUploader";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  CalendarCheck2,
  Upload,
  Settings,
  FolderOpen,
  FileText,
  ArrowRight,
} from "lucide-react";
import { BlockPrintDivider } from "@/components/motifs/BlockPrintDivider";
import { SubjectCoverArtSlot } from "@/components/art/SubjectCoverArtSlot";

interface SubjectWithRelations {
  id: string;
  name: string;
  code: string;
  credits: number;
  sharePrice: number;
  keepFresh?: boolean;
  term?: { id: string; name: string } | null;
  professor?: {
    id: string;
    name: string;
    email?: string | null;
    officeHours?: string | null;
  } | null;
  evaluationComponents: { id: string; name: string; weight: number }[];
  concepts: {
    id: string;
    name: string;
    definition: string;
    value: number;
    cards?: { id: string }[];
  }[];
  decks: { id: string; title: string; sessionNumber?: number | null; slideCount: number; processed: boolean }[];
  notes: { id: string; title: string; content: string; createdAt: Date | string }[];
  assignments: { id: string; title: string; deadline: Date | string; status: string; weight: number }[];
}

export const DepartmentDetailClient: React.FC<{ initialSubject: SubjectWithRelations }> = ({
  initialSubject,
}) => {
  const [subject, setSubject] = useState(initialSubject);
  const [activeTab, setActiveTab] = useState<"learn" | "practice" | "work">("learn");
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { success } = useToast();

  const refreshSubject = async () => {
    try {
      const res = await fetch(`/api/subjects/${subject.id}`);
      const data = await res.json();
      if (res.ok && data.subject) {
        setSubject(data.subject);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const masteryPercent = Math.round(subject.sharePrice);
  const totalCardsCount = subject.concepts.reduce((acc, c) => acc + (c.cards?.length || 0), 0);

  const tabs = [
    {
      id: "learn",
      label: `Learn (${subject.decks.length} decks · ${subject.notes.length} notes)`,
      icon: BookOpen,
    },
    {
      id: "practice",
      label: `Practice (${subject.concepts.length} topics)`,
      icon: CheckCircle2,
    },
    {
      id: "work",
      label: `Work (${subject.assignments.length} assignments)`,
      icon: CalendarCheck2,
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* 1. CRAFT SUBJECT HEADER WITH HANDMADE RING & MADHUBANI ART */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-5">
          {/* Subject Cover Art Slot */}
          <div className="shrink-0">
            <SubjectCoverArtSlot subjectCode={subject.code} className="w-16 h-16" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-text-muted">
              <span className="px-1.5 py-0.2 rounded bg-border/40 text-[10px] text-text font-medium">
                {subject.term?.name || "Semester 1"}
              </span>
              <span>·</span>
              <span>{subject.code}</span>
              <span>·</span>
              <span>{subject.credits} credits</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal">
              {subject.name}
            </h1>

            <p className="flex items-center space-x-2 text-sm text-text-muted font-body">
              <GraduationCap size={15} className="text-cobalt" />
              <span>{subject.professor?.name || "Faculty unassigned"}</span>
            </p>
          </div>
        </div>

        {/* Hand-Drawn Ring for Mastery & Action */}
        <div className="flex items-center space-x-4 shrink-0">
          {/* Hand-drawn Turquoise Mastery Ring */}
          <div className="flex items-center space-x-3 deckle-card px-3.5 py-2 rounded-md">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-border/40"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-turquoise"
                  strokeDasharray={`${masteryPercent}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-medium text-text tabular-nums">
                {masteryPercent}%
              </span>
            </div>
            <div className="text-left text-xs">
              <div className="text-text font-medium">Mastery</div>
              <div className="text-[11px] text-text-muted">Current strength</div>
            </div>
          </div>

          {/* Subject Settings (gear) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-md border border-border bg-surface text-text-muted hover:text-text transition-colors"
            title="Course settings & evaluation scheme"
            aria-label="Course settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Block-Print Divider */}
      <BlockPrintDivider />

      {/* SINGLE PRIMARY ACTION FOR THIS SUBJECT */}
      <div className="flex justify-between items-center py-1">
        <Link
          href={`/review?subjectId=${subject.id}`}
          className="stamp-press inline-flex items-center space-x-2.5 px-6 py-3 rounded-md bg-[#1F4E8C] dark:bg-[#7FA6E0] text-[#F7F1E5] dark:text-[#141B2D] text-sm font-medium shadow hover:opacity-95 transition-all whitespace-nowrap shrink-0"
        >
          <CheckCircle2 size={16} />
          <span className="whitespace-nowrap">Practice this subject ({totalCardsCount} cards)</span>
        </Link>

        <p className="font-handwriting text-xs text-text-muted hidden sm:block">
          Takes about 5 minutes
        </p>
      </div>

      {/* 3 CONSOLIDATED TABS (Sentence Case) */}
      <div className="flex border-b border-border/40 overflow-x-auto text-sm">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center space-x-2 px-5 py-3 font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap ${
                isActive
                  ? "border-cobalt text-cobalt font-semibold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LEARN (Decks + Notes) */}
      {activeTab === "learn" && (
        <div className="space-y-8 pt-2">
          {/* Decks */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-text font-normal">Slide decks</h3>
              <Link href="/decks" className="text-xs text-cobalt hover:underline flex items-center space-x-1">
                <span>Upload deck</span>
                <ArrowRight size={11} />
              </Link>
            </div>

            {subject.decks.length === 0 ? (
              <div className="deckle-card rounded-md p-6 text-center text-sm text-text-muted font-handwriting">
                No decks uploaded yet. Upload a deck to read in Book mode.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subject.decks.map((d) => (
                  <Link
                    key={d.id}
                    href={`/decks/${d.id}?mode=book`}
                    className="deckle-card rounded-md p-5 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-heading text-base text-text group-hover:text-cobalt transition-colors">
                        {d.title}
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Session {d.sessionNumber || "1"} · {d.slideCount} slides
                      </p>
                    </div>
                    <span className="text-xs font-handwriting text-cobalt group-hover:translate-x-1 transition-transform">
                      Open &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="space-y-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-text font-normal">Notes</h3>
              <Link href="/notes" className="text-xs text-cobalt hover:underline flex items-center space-x-1">
                <span>View all notes</span>
                <ArrowRight size={11} />
              </Link>
            </div>

            {subject.notes.length === 0 ? (
              <div className="deckle-card rounded-md p-6 text-center text-sm text-text-muted font-handwriting">
                No notes written yet for this course.
              </div>
            ) : (
              <div className="space-y-3">
                {subject.notes.map((n) => (
                  <div key={n.id} className="deckle-card rounded-md p-5 space-y-1">
                    <h4 className="font-heading text-base text-text">{n.title}</h4>
                    <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: PRACTICE (Topics + Cards) */}
      {activeTab === "practice" && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-xl text-text font-normal">Topics</h3>
              <p className="text-xs text-text-muted">Core concepts tracked for long-term recall.</p>
            </div>
            <button
              onClick={() => setIsSyllabusOpen(true)}
              className="text-xs text-cobalt hover:underline inline-flex items-center space-x-1 whitespace-nowrap shrink-0"
            >
              <Upload size={12} />
              <span className="whitespace-nowrap">Import syllabus</span>
            </button>
          </div>

          {subject.concepts.length === 0 ? (
            <div className="deckle-card rounded-md p-6 text-center text-sm text-text-muted font-handwriting">
              No topics added yet. Upload a syllabus or slides to extract topics.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subject.concepts.map((c) => (
                <div key={c.id} className="deckle-card rounded-md p-5 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-heading text-base text-text font-normal">{c.name}</h4>
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1">
                      {c.definition}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-text-muted">
                    <span>Strength: {Math.round(c.value)}%</span>
                    <span>{c.cards?.length || 0} cards</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORK (Assignments) */}
      {activeTab === "work" && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xl text-text font-normal">Assignments</h3>
            <Link href="/planner" className="text-xs text-cobalt hover:underline flex items-center space-x-1">
              <span>View planner</span>
              <ArrowRight size={11} />
            </Link>
          </div>

          {subject.assignments.length === 0 ? (
            <div className="deckle-card rounded-md p-6 text-center text-sm text-text-muted font-handwriting">
              No pending deliverables for this subject.
            </div>
          ) : (
            <div className="space-y-3">
              {subject.assignments.map((a) => (
                <div key={a.id} className="deckle-card rounded-md p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="text-text font-medium">{a.title}</div>
                    <div className="text-xs text-text-muted">Weight: {a.weight}%</div>
                  </div>
                  <span className="text-xs text-text-muted tabular-nums">
                    {new Date(a.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBJECT SETTINGS MODAL */}
      <Dialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={`${subject.name} · Scheme & details`}
      >
        <div className="space-y-6 text-sm">
          {/* Keep Fresh Toggle */}
          <div className="p-3.5 rounded-lg border border-border bg-surface/70 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-heading text-sm font-medium text-text">Keep fresh in daily review</h4>
                <p className="text-xs text-text-muted">
                  Light spaced touchpoints (a few cards a week) so knowledge stays retained.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const nextVal = subject.keepFresh === false ? true : false;
                    const res = await fetch(`/api/subjects/${subject.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ keepFresh: nextVal }),
                    });
                    if (res.ok) {
                      setSubject((prev) => ({ ...prev, keepFresh: nextVal }));
                      success(nextVal ? "Keep fresh enabled" : "Keep fresh disabled");
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`px-3 py-1 rounded text-xs font-body font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  subject.keepFresh !== false
                    ? "bg-leaf/15 text-leaf border-leaf/40 hover:bg-leaf/25"
                    : "bg-surface text-text-muted border-border hover:text-text"
                }`}
              >
                {subject.keepFresh !== false ? "Fresh ON" : "Fresh OFF"}
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-base text-text mb-1">Evaluation components</h4>
            <p className="text-xs text-text-muted mb-3">
              Components must sum to 100%.
            </p>
            <EvaluationEditor
              subjectId={subject.id}
              initialComponents={subject.evaluationComponents}
              onSaveSuccess={() => {
                refreshSubject();
                success("Evaluation scheme updated");
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isSyllabusOpen}
        onClose={() => setIsSyllabusOpen(false)}
        title="Upload syllabus outline"
      >
        <SyllabusUploader
          subjectId={subject.id}
          onClose={() => setIsSyllabusOpen(false)}
          onSuccess={refreshSubject}
        />
      </Dialog>
    </div>
  );
};

export default DepartmentDetailClient;
