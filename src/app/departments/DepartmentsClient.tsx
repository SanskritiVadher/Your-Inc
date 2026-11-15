"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SubjectCover } from "@/components/ui/SubjectCover";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { Plus, Settings, ChevronDown, Check } from "lucide-react";

export interface TermItem {
  id: string;
  name: string;
  isCurrent: boolean;
  isArchived: boolean;
  startDate?: string | null;
  endDate?: string | null;
  order: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  credits: number;
  sharePrice: number;
  termId?: string | null;
  deckCount?: number;
  cardsCount?: number;
  mastery?: number;
  keepFresh?: boolean;
  professor?: {
    name: string;
  } | null;
}

interface DepartmentsClientProps {
  terms: TermItem[];
  initialSubjects: SubjectItem[];
}

export function DepartmentsClient({ terms, initialSubjects }: DepartmentsClientProps) {
  // Find current semester as default, otherwise the most recent one
  const currentTerm =
    terms.find((t) => t.isCurrent) ||
    [...terms].sort((a, b) => b.order - a.order)[0];

  const [selectedTermId, setSelectedTermId] = useState<string>(currentTerm?.id || "all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedTerm = terms.find((t) => t.id === selectedTermId);

  // Filter subjects by selected semester
  const filteredSubjects =
    selectedTermId === "all"
      ? initialSubjects
      : initialSubjects.filter((s) => s.termId === selectedTermId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80 gap-4">
        <div>
          <span className="font-body text-xs font-semibold text-primary">
            Degree Curriculum
          </span>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Course Subjects
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Track syllabus mastery and review schedules across every academic semester.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings?tab=semesters"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-text/10 bg-surface text-xs font-body font-medium text-text hover:bg-surface-raised transition-colors whitespace-nowrap shrink-0"
            title="Manage academic semesters and dates"
          >
            <Settings size={13} />
            <span className="whitespace-nowrap">Semesters</span>
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-primary text-white dark:text-[#1A1714] text-xs font-body font-medium hover:bg-primary/90 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Add Subject</span>
          </Link>
        </div>
      </div>

      {/* Small Semester Dropdown */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-text/10 bg-surface/80">
        <div className="flex items-center gap-2 relative">
          <span className="text-xs font-body text-text-muted whitespace-nowrap">Semester:</span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-text/10 bg-surface text-xs font-body font-medium text-text hover:border-primary/40 transition-colors shadow-2xs whitespace-nowrap"
              aria-label="Select semester"
            >
              <span>{selectedTermId === "all" ? "All semesters" : selectedTerm?.name || "Select semester"}</span>
              {selectedTerm?.isCurrent && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium border border-primary/30 whitespace-nowrap">
                  Current
                </span>
              )}
              <ChevronDown size={13} className="text-text-muted ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-md border border-text/10 bg-surface shadow-xl z-30 p-1 font-body text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTermId("all");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
                    selectedTermId === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-bg/80 text-text"
                  }`}
                >
                  <span>All semesters</span>
                  {selectedTermId === "all" && <Check size={13} />}
                </button>

                <div className="h-[1px] bg-text/10 my-1" />

                {terms.map((t) => {
                  const isSelected = selectedTermId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTermId(t.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
                        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-bg/80 text-text"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t.name}</span>
                        {t.isCurrent && (
                          <span className="text-[9px] px-1 rounded bg-primary/20 text-primary font-medium">Current</span>
                        )}
                      </div>
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedTerm && (
          <div className="text-xs font-body text-text-muted hidden sm:block">
            {selectedTerm.isCurrent ? "Current semester" : selectedTerm.name}
          </div>
        )}
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSubjects.map((subj) => (
            <div key={subj.id} className="flex justify-center">
              <Link href={`/departments/${subj.id}`} className="block focus:outline-none w-full">
                <SubjectCover
                  id={subj.id}
                  name={subj.name}
                  code={subj.code}
                  credits={subj.credits}
                  sharePrice={subj.sharePrice}
                  changePercent={0.0}
                  deckCount={subj.deckCount}
                  cardsCount={subj.cardsCount}
                  mastery={subj.mastery}
                  size="md"
                />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          illustrationType="tree"
          title={
            selectedTermId === "all"
              ? "No Subjects Enrolled"
              : `No Subjects in ${selectedTerm?.name || "this semester"}`
          }
          message="Add course subjects to begin tracking syllabus mastery and learning topics."
          actionText="Add Subject"
          actionHref="/onboarding"
        />
      )}
    </div>
  );
}
