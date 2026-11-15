"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SubjectCover } from "@/components/ui/SubjectCover";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { Plus, Calendar, Settings, ChevronDown, Check, Archive, Sparkles } from "lucide-react";

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
  // Find current semester as default, otherwise first semester or "all"
  const currentTerm = terms.find((t) => t.isCurrent) || terms[0];
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
          <span className="font-body text-xs font-semibold text-leaf">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-border bg-surface text-xs font-body font-medium text-text hover:bg-surface-raised transition-colors whitespace-nowrap shrink-0"
            title="Manage academic semesters and dates"
          >
            <Settings size={13} />
            <span className="whitespace-nowrap">Semesters</span>
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-cobalt text-white dark:text-[#141B2D] text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Add Subject</span>
          </Link>
        </div>
      </div>

      {/* Small Semester Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-surface/80">
        <div className="flex items-center gap-2 relative">
          <span className="text-xs font-body text-text-muted whitespace-nowrap">Semester:</span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-surface text-xs font-body font-semibold text-text hover:border-cobalt/40 transition-colors shadow-2xs whitespace-nowrap"
              aria-label="Select semester"
            >
              <span>{selectedTermId === "all" ? "All Semesters" : selectedTerm?.name || "Select Semester"}</span>
              {selectedTerm?.isCurrent && (
                <span className="px-1.5 py-0.2 rounded-full bg-leaf/15 text-leaf text-[10px] font-medium border border-leaf/30 whitespace-nowrap">
                  Current
                </span>
              )}
              {selectedTerm?.isArchived && (
                <span className="px-1.5 py-0.2 rounded-full bg-turmeric/15 text-turmeric text-[10px] font-medium border border-turmeric/30 whitespace-nowrap">
                  Archived
                </span>
              )}
              <ChevronDown size={13} className="text-text-muted ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-md border border-border bg-surface shadow-xl z-30 p-1 font-body text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTermId("all");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
                    selectedTermId === "all" ? "bg-cobalt/10 text-cobalt font-medium" : "hover:bg-bg/80 text-text"
                  }`}
                >
                  <span>All Semesters ({initialSubjects.length} subjects)</span>
                  {selectedTermId === "all" && <Check size={13} />}
                </button>

                <div className="h-[1px] bg-border/40 my-1" />

                {terms.map((t) => {
                  const isSelected = selectedTermId === t.id;
                  const count = initialSubjects.filter((s) => s.termId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTermId(t.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
                        isSelected ? "bg-cobalt/10 text-cobalt font-medium" : "hover:bg-bg/80 text-text"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t.name}</span>
                        {t.isCurrent && (
                          <span className="text-[9px] px-1 rounded bg-leaf/20 text-leaf">Active</span>
                        )}
                        {t.isArchived && (
                          <span className="text-[9px] px-1 rounded bg-turmeric/20 text-turmeric">Archive</span>
                        )}
                      </div>
                      <span className="text-text-muted text-[11px] shrink-0 ml-2">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick pill tabs for easy one-click switching */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setSelectedTermId("all")}
              className={`px-2.5 py-1 rounded text-xs font-body transition-colors whitespace-nowrap ${
                selectedTermId === "all"
                  ? "bg-cobalt text-white dark:text-[#141B2D] font-medium"
                  : "bg-surface text-text-muted hover:text-text border border-border/50"
              }`}
            >
              All
            </button>
            {terms.map((t) => {
              const active = selectedTermId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTermId(t.id)}
                  className={`px-2.5 py-1 rounded text-xs font-body transition-colors whitespace-nowrap flex items-center gap-1 ${
                    active
                      ? "bg-cobalt text-white dark:text-[#141B2D] font-medium"
                      : "bg-surface text-text-muted hover:text-text border border-border/50"
                  }`}
                >
                  <span>{t.name}</span>
                  {t.isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Semester Details & Status */}
        <div className="flex items-center gap-3 text-xs font-body text-text-muted">
          {selectedTerm && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-cobalt" />
              <span>
                {selectedTerm.startDate && selectedTerm.endDate
                  ? `${new Date(selectedTerm.startDate).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })} – ${new Date(selectedTerm.endDate).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}`
                  : selectedTerm.isCurrent
                  ? "Current Academic Session"
                  : "Archived Term"}
              </span>
            </div>
          )}

          {selectedTerm?.isArchived && (
            <Link
              href="/settings?tab=semesters"
              className="text-cobalt hover:underline flex items-center gap-1 text-xs whitespace-nowrap font-medium"
            >
              <Archive size={12} />
              <span>Wrap-up</span>
            </Link>
          )}
        </div>
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredSubjects.map((subj) => (
            <div key={subj.id} className="flex justify-center">
              <Link href={`/departments/${subj.id}`} className="block focus:outline-none">
                <SubjectCover
                  id={subj.id}
                  name={subj.name}
                  code={subj.code}
                  credits={subj.credits}
                  sharePrice={subj.sharePrice}
                  changePercent={0.0}
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
