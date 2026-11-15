"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NotesEditor } from "@/components/notes/NotesEditor";
import { Plus, Search, Tag, BookOpen, Layers, Clock, FileText, ChevronRight, ChevronLeft, Book } from "lucide-react";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface ConceptOption {
  id: string;
  name: string;
  subjectId: string;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags?: string | null;
  subjectId: string;
  conceptId?: string | null;
  slideId?: string | null;
  updatedAt: string | Date;
  subject?: { id: string; name: string; code: string };
  concept?: { id: string; name: string } | null;
}

interface NotesClientProps {
  initialNotes: NoteItem[];
  subjects: SubjectOption[];
  concepts: ConceptOption[];
}

export const NotesClient: React.FC<NotesClientProps> = ({
  initialNotes,
  subjects,
  concepts,
}) => {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(notes[0] || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(notes.length === 0);
  const [isNotebookView, setIsNotebookView] = useState(false);
  const [notebookPageIndex, setNotebookPageIndex] = useState(0);

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.tags && n.tags.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject = !filterSubjectId || n.subjectId === filterSubjectId;

    return matchesSearch && matchesSubject;
  });

  const handleStartNewNote = () => {
    setActiveNote(null);
    setIsCreatingNew(true);
  };

  const handleNoteSaved = (saved: NoteItem) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      } else {
        return [saved, ...prev];
      }
    });
    setActiveNote(saved);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded bg-surface border border-border">
        <div className="flex items-center space-x-2">
          <FileText size={16} className="text-sindoor" />
          <span className="font-heading text-base font-medium text-text">Course Notes</span>
          <span className="text-xs font-mono text-text-muted">({filteredNotes.length} notes)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsNotebookView(!isNotebookView)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
              isNotebookView
                ? "bg-turmeric/15 border-turmeric text-turmeric-dark font-medium"
                : "border-border text-text-muted hover:text-text bg-surface"
            }`}
          >
            <BookOpen size={14} />
            <span>{isNotebookView ? "Switch to Editor Mode" : "Reading Mode"}</span>
          </button>
        </div>
      </div>

      {isNotebookView ? (
        /* Notebook Clean Reading View */
        filteredNotes.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded bg-surface/50 text-xs font-mono text-text-muted">
            No notes found to read. Create a note in Editor Mode first.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {(() => {
              const currentNote = filteredNotes[Math.min(notebookPageIndex, filteredNotes.length - 1)];
              if (!currentNote) return null;
              return (
                <div className="p-6 rounded-lg border border-border bg-surface space-y-4 shadow-xs">
                  {/* Note Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-body text-xs px-2.5 py-0.5 rounded bg-cobalt/10 text-cobalt font-medium">
                        {currentNote.subject?.code || "GEN"} · {currentNote.subject?.name || "General"}
                      </span>
                      {currentNote.concept && (
                        <span className="text-xs text-text-muted">
                          • {currentNote.concept.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted flex items-center gap-1 font-body">
                      <Clock size={12} />
                      {new Date(currentNote.updatedAt).toLocaleDateString("en-IN", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Note Title */}
                  <h1 className="font-heading text-xl sm:text-2xl font-normal text-text">
                    {currentNote.title}
                  </h1>

                  {/* Note Content */}
                  <div className="font-body text-sm text-text leading-relaxed whitespace-pre-wrap py-2">
                    {currentNote.content}
                  </div>

                  {/* Tags */}
                  {currentNote.tags && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {currentNote.tags.split(",").map((t, ti) => (
                        <span
                          key={ti}
                          className="px-2 py-0.5 rounded bg-paper border border-border text-xs text-text-muted font-body"
                        >
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Controls / Navigation */}
                  <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs font-body text-text-muted">
                    <button
                      type="button"
                      disabled={notebookPageIndex <= 0}
                      onClick={() => setNotebookPageIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border bg-paper hover:bg-paper-sunken disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>
                    <span className="tabular-nums">
                      Note {Math.min(notebookPageIndex + 1, filteredNotes.length)} of {filteredNotes.length}
                    </span>
                    <button
                      type="button"
                      disabled={notebookPageIndex >= filteredNotes.length - 1}
                      onClick={() => setNotebookPageIndex((prev) => Math.min(filteredNotes.length - 1, prev + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border bg-paper hover:bg-paper-sunken disabled:opacity-30 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )
      ) : (
        /* Standard Split Editor / Directory View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
          {/* Sidebar: Notes Directory */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-sindoor" />
                  <h2 className="font-heading text-lg font-semibold text-text">Lecture Notes</h2>
                </div>
                <button
                  onClick={handleStartNewNote}
                  className="px-2.5 py-1 rounded bg-sindoor text-white text-xs font-body font-medium hover:bg-sindoor-dark transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus size={13} />
                  <span>New Note</span>
                </button>
              </div>

              {/* Search & Subject Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes, tags, concepts..."
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-bg border border-border text-xs font-body text-text focus:outline-none focus:border-sindoor"
                  />
                </div>

                {subjects.length > 0 && (
                  <select
                    value={filterSubjectId}
                    onChange={(e) => setFilterSubjectId(e.target.value)}
                    className="w-full p-1.5 rounded bg-bg border border-border text-xs font-mono text-text focus:outline-none focus:border-sindoor"
                  >
                    <option value="">All Departments</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}: {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded bg-surface/50 text-xs font-body text-text-muted">
                  {notes.length === 0 ? "No lecture notes created yet. Click '+ New Note' to start." : "No notes match the active filter."}
                </div>
              ) : (
                filteredNotes.map((n) => {
                  const isSelected = activeNote?.id === n.id && !isCreatingNew;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        setActiveNote(n);
                        setIsCreatingNew(false);
                      }}
                      className={`p-3 rounded border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-sindoor bg-surface shadow-sm"
                          : "border-border bg-surface/70 hover:border-sindoor/40 hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-turmeric/10 text-turmeric font-semibold">
                          {n.subject?.code || "GEN"}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(n.updatedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <h3 className="font-heading text-sm font-medium text-text truncate">
                        {n.title}
                      </h3>

                      <p className="font-body text-xs text-text-muted line-clamp-2 mt-1 leading-relaxed">
                        {n.content || "Empty note contents..."}
                      </p>

                      {n.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {n.tags.split(",").map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-bg border border-border text-[9px] font-mono text-text-muted"
                            >
                              #{t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Column: Rich Bahi-Khata Notes Editor */}
          <div className="lg:col-span-8">
            <NotesEditor
              key={activeNote?.id || "new-note"}
              initialNote={isCreatingNew ? null : activeNote}
              subjects={subjects}
              concepts={concepts}
              onNoteSaved={handleNoteSaved}
            />
          </div>
        </div>
      )}
    </div>
  );
};
