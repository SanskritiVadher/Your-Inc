"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Save, Sparkles, CheckCircle2, CloudOff, Cloud, Plus, Trash2, Tag, BookOpen, Layers } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { CardType } from "@prisma/client";

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

interface NotesEditorProps {
  initialNote?: NoteItem | null;
  subjects: SubjectOption[];
  concepts: ConceptOption[];
  onNoteSaved?: (note: NoteItem) => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  initialNote,
  subjects,
  concepts,
  onNoteSaved,
}) => {
  const { success, error: toastError, info } = useToast();

  const [noteId, setNoteId] = useState<string | null>(initialNote?.id || null);
  const [title, setTitle] = useState(initialNote?.title || "Classroom Note");
  const [content, setContent] = useState(initialNote?.content || "");
  const [subjectId, setSubjectId] = useState(initialNote?.subjectId || subjects[0]?.id || "");
  const [conceptId, setConceptId] = useState(initialNote?.conceptId || "");
  const [tags, setTags] = useState(initialNote?.tags || "");
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline">("saved");

  // "Make cards from this note" state
  const [isMakeCardsOpen, setIsMakeCardsOpen] = useState(false);
  const [suggestedCards, setSuggestedCards] = useState<
    { type: CardType; front: string; back: string; selected?: boolean }[]
  >([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter concepts based on selected subject
  const availableConcepts = concepts.filter((c) => c.subjectId === subjectId);

  // Sync to backend or offline localStorage
  const saveNote = useCallback(async (isManual = false) => {
    if (!title.trim() || !subjectId) return;

    if (!navigator.onLine) {
      setSyncStatus("offline");
      localStorage.setItem(`offline_note_${noteId || "new"}`, JSON.stringify({
        id: noteId,
        title,
        content,
        subjectId,
        conceptId: conceptId || null,
        tags,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    setSyncStatus("saving");
    try {
      let res: Response;
      if (noteId) {
        res = await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: noteId,
            title,
            content,
            subjectId,
            conceptId: conceptId || null,
            tags,
          }),
        });
      } else {
        res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            subjectId,
            conceptId: conceptId || null,
            tags,
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.note) {
        setNoteId(data.note.id);
        setSyncStatus("saved");
        if (isManual) success("Note Saved");
        if (onNoteSaved) onNoteSaved(data.note);
      }
    } catch (e) {
      setSyncStatus("offline");
    }
  }, [noteId, title, content, subjectId, conceptId, tags, onNoteSaved, success]);

  // Debounced Autosave (every 3.5 seconds of typing)
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveNote(false);
    }, 3500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [title, content, subjectId, conceptId, tags, saveNote]);

  // Handle Online/Offline window events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus("saving");
      // Check for offline cached notes and sync
      const cached = localStorage.getItem(`offline_note_${noteId || "new"}`);
      if (cached) {
        saveNote(false);
        localStorage.removeItem(`offline_note_${noteId || "new"}`);
        info("Reconnected to internet", "Offline notes saved.");
      }
    };
    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [noteId, saveNote, info]);

  // "Make cards from this note" trigger
  const handleOpenMakeCards = async () => {
    if (!noteId) {
      await saveNote(true);
    }
    if (!content.trim()) {
      toastError("Note content is empty. Add notes to generate recall cards.");
      return;
    }

    setIsGeneratingCards(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/make-cards`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.suggestedCards) {
        setSuggestedCards(data.suggestedCards.map((c: { type: CardType; front: string; back: string }) => ({ ...c, selected: true })));
        setIsMakeCardsOpen(true);
      } else {
        toastError("Could not suggest cards");
      }
    } catch (e) {
      toastError("Failed to generate cards");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleCommitSuggestedCards = async () => {
    const selected = suggestedCards.filter((c) => c.selected);
    if (selected.length === 0) {
      toastError("No cards selected for approval");
      return;
    }

    try {
      const res = await fetch(`/api/notes/${noteId}/make-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          approvedCards: selected,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        success("Review Cards Created", `Added ${data.count} new cards ready for review!`);
        setIsMakeCardsOpen(false);
      }
    } catch (e) {
      toastError("Something went wrong. Try again.");
    }
  };

  // Markdown shortcut helper
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("note-content-area") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || "text";
    const replacement = `${prefix}${selected}${suffix}`;
    setContent(text.substring(0, start) + replacement + text.substring(end));
  };

  return (
    <div className="rounded-[3px] border border-border bg-surface p-5 space-y-4">
      {/* Header bar: Title + Tags + Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title (e.g. DCF Terminal Growth Rate Discussion)"
          className="font-heading text-xl md:text-2xl text-text bg-transparent border-b border-transparent hover:border-border focus:border-sindoor focus:outline-none flex-1"
        />

        <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
          {/* Sync indicator */}
          <span className="flex items-center space-x-1 text-text-muted">
            {syncStatus === "saved" ? (
              <>
                <Cloud size={14} className="text-leaf" />
                <span className="text-leaf">Saved</span>
              </>
            ) : syncStatus === "saving" ? (
              <>
                <Cloud size={14} className="animate-pulse text-turmeric" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CloudOff size={14} className="text-sindoor" />
                <span className="text-sindoor">Offline Cache</span>
              </>
            )}
          </span>

          {/* Make cards button */}
          <button
            type="button"
            disabled={isGeneratingCards}
            onClick={handleOpenMakeCards}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[2px] bg-sindoor text-white font-body font-semibold hover:bg-sindoor/90 transition-all shadow-xs"
          >
            <Sparkles size={13} />
            <span>{isGeneratingCards ? "Analyzing..." : "Make cards from note"}</span>
          </button>
        </div>
      </div>

      {/* Tagging selectors: Subject + Concept */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div>
          <label className="block text-[10px] uppercase text-text-muted mb-1">Department</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-[2px] border border-border/80 bg-bg p-1.5 text-xs text-text focus:outline-none focus:border-sindoor"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-text-muted mb-1">Concept Asset</label>
          <select
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            className="w-full rounded-[2px] border border-border/80 bg-bg p-1.5 text-xs text-text focus:outline-none focus:border-sindoor"
          >
            <option value="">(Unassigned Concept)</option>
            {availableConcepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-text-muted mb-1">Tags / Keywords</label>
          <input
            type="text"
            placeholder="e.g. Midterm, WACC, Prof Quote"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-[2px] border border-border/80 bg-bg p-1.5 text-xs text-text focus:outline-none focus:border-sindoor"
          />
        </div>
      </div>

      {/* Markdown Shortcut Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60 text-xs font-mono">
        <button
          type="button"
          onClick={() => insertFormatting("## ", "")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("### ", "")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("**", "**")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("\n| Metric | Value |\n|---|---|\n| Operating Margin | 18.5% |\n")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Insert Table"
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("```python\n", "\n```")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Code Block"
        >
          Code
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("![Diagram description](", ")")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Image Markdown"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => insertFormatting("• ")}
          className="px-2 py-1 rounded border border-border bg-bg/50 hover:bg-bg text-text"
          title="Bullet Point"
        >
          Bullet
        </button>
      </div>

      {/* Content Area */}
      <textarea
        id="note-content-area"
        rows={14}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Draft your lecture commentary, case analysis, tables and formulas here... Autosaves continuously with offline local sync."
        className="w-full rounded-[2px] border border-border/70 bg-bg/40 p-3.5 text-xs leading-relaxed font-body text-text focus:outline-none focus:border-sindoor"
      />

      {/* Make Cards Interactive Modal */}
      <Dialog
        isOpen={isMakeCardsOpen}
        onClose={() => setIsMakeCardsOpen(false)}
        title="Make Cards from Note"
        description="Review AI-suggested active recall cards generated from your notes. Approve before adding to FSRS."
        className="max-w-2xl"
      >
        <div className="space-y-4 font-body text-xs">
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {suggestedCards.map((c, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[2px] border border-border bg-surface space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="uppercase text-sindoor font-semibold">{c.type}</span>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={(e) => {
                        const updated = [...suggestedCards];
                        updated[idx].selected = e.target.checked;
                        setSuggestedCards(updated);
                      }}
                      className="rounded text-sindoor"
                    />
                    <span>Approve</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted">Prompt</label>
                  <input
                    type="text"
                    value={c.front}
                    onChange={(e) => {
                      const updated = [...suggestedCards];
                      updated[idx].front = e.target.value;
                      setSuggestedCards(updated);
                    }}
                    className="w-full rounded-[2px] border border-border bg-bg p-1.5 text-xs text-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted">Model Answer</label>
                  <textarea
                    rows={2}
                    value={c.back}
                    onChange={(e) => {
                      const updated = [...suggestedCards];
                      updated[idx].back = e.target.value;
                      setSuggestedCards(updated);
                    }}
                    className="w-full rounded-[2px] border border-border bg-bg p-1.5 text-xs text-text"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsMakeCardsOpen(false)}
              className="px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitSuggestedCards}
              className="px-5 py-2 rounded-[2px] bg-sindoor text-white font-body text-xs font-semibold hover:bg-sindoor/90"
            >
              Save approved cards
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default NotesEditor;
