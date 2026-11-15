"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  Briefcase,
  Layers,
  CalendarCheck2,
  Search,
  Pin,
  Star,
  Sparkles,
  ExternalLink,
  Filter,
  CheckCircle2,
  Calendar,
  Calculator,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { InterviewPrepModal } from "@/components/career/InterviewPrepModal";
import { FormulaSheetView } from "./FormulaSheetView";

export interface LibraryItem {
  id: string;
  type: "deck" | "note" | "project" | "topic" | "assignment";
  title: string;
  subtitle: string;
  semesterId?: string;
  semesterName: string;
  subjectId?: string;
  subjectName: string;
  subjectCode: string;
  date: string;
  url: string;
  isSignature?: boolean;
  scoreOrValue?: number;
}

export interface SemesterFilterItem {
  id: string;
  name: string;
  isCurrent: boolean;
  isArchived: boolean;
}

export interface SubjectFilterItem {
  id: string;
  name: string;
  code: string;
  termId?: string | null;
}

interface LibraryClientProps {
  initialItems: LibraryItem[];
  semesters: SemesterFilterItem[];
  subjects: SubjectFilterItem[];
}

export function LibraryClient({ initialItems, semesters, subjects }: LibraryClientProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>(
    tabParam === "formulas" ? "formulas" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (tabParam === "formulas") {
      setSelectedType("formulas");
    }
  }, [tabParam]);

  const handleToggleSignature = async (projectId: string) => {
    try {
      const res = await fetch("/api/career/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_signature",
          projectId,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle signature project");
      const json = await res.json();
      const updated = json.project;

      setItems((prev) =>
        prev.map((item) =>
          item.id === projectId && item.type === "project"
            ? { ...item, isSignature: updated.isSignature }
            : item
        )
      );

      success(
        updated.isSignature ? "Pinned as Signature Project" : "Unpinned from Signature",
        updated.title
      );
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error updating signature status");
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedSemester !== "all") {
      result = result.filter((item) => item.semesterId === selectedSemester);
    }

    if (selectedSubject !== "all") {
      result = result.filter((item) => item.subjectId === selectedSubject);
    }

    if (selectedType !== "all") {
      result = result.filter((item) => item.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.subjectName.toLowerCase().includes(q) ||
          item.subjectCode.toLowerCase().includes(q) ||
          item.semesterName.toLowerCase().includes(q)
      );
    }

    // Sort: signature projects always float to top!
    return [...result].sort((a, b) => {
      if (a.isSignature && !b.isSignature) return -1;
      if (!a.isSignature && b.isSignature) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [items, selectedSemester, selectedSubject, selectedType, searchQuery]);

  const typeTabs = [
    { id: "all", label: "All Items", icon: Layers },
    { id: "deck", label: "Lecture Decks", icon: BookOpen },
    { id: "note", label: "Notes", icon: FileText },
    { id: "project", label: "Projects & Vault", icon: Briefcase },
    { id: "topic", label: "Topics", icon: CheckCircle2 },
    { id: "assignment", label: "Assignments", icon: CalendarCheck2 },
    { id: "formulas", label: "Formula sheet", icon: Calculator },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/80 gap-4">
        <div>
          <span className="font-body text-xs font-semibold text-leaf">
            Universal Knowledge Repository
          </span>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Library
          </h1>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Every lecture deck, personal note, topic, assignment, and deliverable across all semesters in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPrepModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-cobalt text-white dark:text-[#1A1714] text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shadow-xs whitespace-nowrap shrink-0"
        >
          <Sparkles size={14} />
          <span className="whitespace-nowrap">Prepare for an Interview</span>
        </button>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-3 overflow-x-auto">
        {typeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedType(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-body transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-cobalt text-white dark:text-[#1A1714] font-medium shadow-2xs"
                  : "bg-surface text-text-muted hover:text-text border border-border/50"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {selectedType === "formulas" ? (
        <FormulaSheetView semesters={semesters} subjects={subjects} />
      ) : (
        <>
          {/* Filter and Search Controls */}
          <div className="space-y-3 p-4 rounded-lg border border-border/80 bg-surface">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search across all semesters by topic, keyword, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded border border-border bg-bg text-text font-body text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-cobalt"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Semester Selector */}
              <div className="flex items-center gap-1.5 text-xs font-body">
                <span className="text-text-muted whitespace-nowrap">Semester:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-border bg-bg text-text font-body text-xs focus:outline-none focus:border-cobalt"
                >
                  <option value="all">All Semesters</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} {sem.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div className="flex items-center gap-1.5 text-xs font-body">
                <span className="text-text-muted whitespace-nowrap">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-border bg-bg text-text font-body text-xs focus:outline-none focus:border-cobalt max-w-[200px]"
                >
                  <option value="all">All Subjects</option>
                  {subjects
                    .filter((s) => selectedSemester === "all" || s.termId === selectedSemester)
                    .map((subj) => (
                      <option key={subj.id} value={subj.id}>
                        {subj.code} · {subj.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

      {/* Items Count Header */}
      <div className="flex items-center justify-between text-xs font-body text-text-muted px-1">
        <span>Showing {filteredItems.length} items</span>
        <span>Signature projects pinned to top</span>
      </div>

      {/* Library Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isProject = item.type === "project";

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between group ${
                  item.isSignature
                    ? "border-leaf/60 bg-leaf/5 shadow-xs"
                    : "border-border/80 bg-surface hover:border-cobalt/40 hover:shadow-2xs"
                }`}
              >
                <div className="space-y-2">
                  {/* Top Metadata: Semester Label & Subject */}
                  <div className="flex items-center justify-between gap-2 text-[11px] font-body">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Semester Label on Every Result */}
                      <span className="px-2 py-0.5 rounded bg-border/40 text-text font-medium text-[10px] whitespace-nowrap">
                        {item.semesterName}
                      </span>
                      <span className="text-text-muted font-medium truncate">
                        {item.subjectCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Signature Project Pin Toggle */}
                      {isProject && (
                        <button
                          type="button"
                          onClick={() => handleToggleSignature(item.id)}
                          className={`p-1 rounded transition-colors ${
                            item.isSignature
                              ? "text-leaf bg-leaf/15 hover:bg-leaf/25"
                              : "text-text-muted/60 hover:text-text"
                          }`}
                          title={item.isSignature ? "Pinned Signature Project" : "Pin as Signature Project"}
                        >
                          <Star size={13} className={item.isSignature ? "fill-leaf" : ""} />
                        </button>
                      )}

                      <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-[10px] text-text-muted uppercase">
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <Link href={item.url} className="block group-hover:text-cobalt transition-colors">
                    <h3 className="font-heading text-base font-normal text-text group-hover:text-cobalt leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                  </Link>

                  {/* Subtitle / Snippet */}
                  <p className="text-xs text-text-muted font-body leading-relaxed line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs font-body">
                  <span className="text-[11px] text-text-muted">
                    {item.scoreOrValue !== undefined
                      ? `Mastery: ${item.scoreOrValue}%`
                      : new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>

                  <Link
                    href={item.url}
                    className="text-cobalt hover:underline inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <span>Open</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center border border-border/80 rounded-lg bg-surface space-y-2">
          <Layers size={28} className="mx-auto text-text-muted/50" />
          <h3 className="font-heading text-base text-text">No library items match this filter</h3>
          <p className="text-xs text-text-muted font-body max-w-sm mx-auto">
            Try switching semesters, selecting &ldquo;All Items&rdquo;, or clearing your search keywords.
          </p>
        </div>
      )}
      </>
      )}

      {/* INTERVIEW PREP MODAL */}
      <InterviewPrepModal
        isOpen={isPrepModalOpen}
        onClose={() => setIsPrepModalOpen(false)}
      />
    </div>
  );
}
