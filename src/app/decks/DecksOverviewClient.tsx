"use client";

import React, { useState } from "react";
import { FolderOpen, Upload, Plus, Sparkles, Filter } from "lucide-react";
import { CourseTimeline, TimelineDeckItem } from "@/components/decks/CourseTimeline";
import { DeckUploadModal } from "@/components/decks/DeckUploadModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface DecksOverviewClientProps {
  initialDecks: TimelineDeckItem[];
  subjects: SubjectItem[];
}

export const DecksOverviewClient: React.FC<DecksOverviewClientProps> = ({
  initialDecks,
  subjects,
}) => {
  const { success, error: toastError } = useToast();
  const [decks, setDecks] = useState<TimelineDeckItem[]>(initialDecks);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDecks = decks.filter((d) =>
    selectedSubjectId === "all" ? true : d.subject?.id === selectedSubjectId
  );

  const handleToggleShare = async (deckId: string, currentShared: boolean) => {
    try {
      const nextShared = !currentShared;
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSharedWithCohort: nextShared }),
      });
      if (res.ok) {
        setDecks((prev) =>
          prev.map((d) => (d.id === deckId ? { ...d, isSharedWithCohort: nextShared } : d))
        );
        success(
          nextShared ? "Shared with Class" : "Private",
          nextShared
            ? "Notice: For enrolled students only. Do not distribute outside your class."
            : "Deck marked private."
        );
      }
    } catch (e) {
      toastError("Failed to update sharing");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="font-body text-xs text-leaf font-semibold flex items-center gap-1.5">
            <FolderOpen size={14} />
            <span>Lecture Decks</span>
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal mt-1">
            Lecture Session Decks
          </h1>
          <PageHeaderBand />
          <p className="text-sm font-body text-text-muted mt-1 max-w-2xl leading-relaxed">
            Upload any class deck to extract slides, generate practice flashcards, detect frameworks, and prepare for exams and discussions.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-[2px] bg-sindoor text-white font-body text-xs font-semibold shadow-xs hover:bg-sindoor/90 transition-colors shrink-0"
        >
          <Upload size={14} />
          <span>Upload Session Deck</span>
        </button>
      </div>

      {/* Subject Filter Bar */}
      {subjects.length > 0 && (
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-text-muted">Filter Subject:</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-[2px] border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-sindoor"
          >
            <option value="all">All Subjects ({decks.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content: Course Timeline or Empty State */}
      {filteredDecks.length === 0 ? (
        <EmptyState
          illustrationType="peacock"
          title="No Class Decks Added Yet"
          message="Upload a PowerPoint (.pptx), PDF (.pdf), or ZIP archive of course decks to automatically extract slides and generate practice cards."
          actionText="Upload First Deck"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <CourseTimeline
          decks={filteredDecks}
          onToggleShare={handleToggleShare}
        />
      )}

      {/* Upload Modal */}
      <DeckUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        subjects={subjects}
      />
    </div>
  );
};

export default DecksOverviewClient;
