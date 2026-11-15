"use client";

import React, { useState } from "react";
import { Brain, Search, Trash2, Edit2, Plus, Sparkles, Filter, CheckSquare, Square } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { useToast } from "@/components/ui/Toast";

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  source: string | null;
  createdAt: Date | string;
  subject?: { id: string; name: string; code: string } | null;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface MemoryVaultClientProps {
  initialMemories: MemoryItem[];
  subjects: SubjectItem[];
}

export const MemoryVaultClient: React.FC<MemoryVaultClientProps> = ({
  initialMemories,
  subjects,
}) => {
  const { success, error: toastError } = useToast();
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories);
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit / Create Dialog states
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("PROFESSOR_PREFERENCE");
  const [newSubjId, setNewSubjId] = useState("");
  const [newSource, setNewSource] = useState("");

  const refreshMemories = async () => {
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      if (res.ok) {
        setMemories(data.memories || []);
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSelect = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = (filteredItems: MemoryItem[]) => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((m) => m.id)));
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        success("Memory Expunged");
        refreshMemories();
      }
    } catch (e) {
      toastError("Failed to delete memory");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        success("Bulk Delete Complete", `Removed ${data.count} memory entries`);
        refreshMemories();
      }
    } catch (e) {
      toastError("Failed to bulk delete");
    }
  };

  const handleSaveNew = async () => {
    if (!newContent.trim()) {
      toastError("Content cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          type: newType,
          subjectId: newSubjId || null,
          source: newSource || "Manual Vault Entry",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit memory");
      }
      success("Memory Stored");
      setIsNewOpen(false);
      setNewContent("");
      refreshMemories();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMemory || !editingMemory.content.trim()) return;
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMemory.id,
          content: editingMemory.content.trim(),
          type: editingMemory.type,
          subjectId: editingMemory.subject?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update memory");
      }
      success("Memory Updated");
      setEditingMemory(null);
      refreshMemories();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Update failed");
    }
  };

  // Filter memories
  const filtered = memories.filter((m) => {
    const matchesQ =
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      (m.source && m.source.toLowerCase().includes(query.toLowerCase())) ||
      (m.subject?.name && m.subject.name.toLowerCase().includes(query.toLowerCase()));

    const matchesSubj =
      selectedSubject === "all"
        ? true
        : selectedSubject === "general"
        ? !m.subject
        : m.subject?.id === selectedSubject;

    const matchesType = selectedType === "all" ? true : m.type === selectedType;

    return matchesQ && matchesSubj && matchesType;
  });

  // Group by Subject
  const groupedBySubject = filtered.reduce((acc, m) => {
    const key = m.subject?.name || "General Degree Rules";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, MemoryItem[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="font-body text-xs text-turmeric font-semibold flex items-center gap-1.5">
            <Brain size={14} />
            <span>Memory Store</span>
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal mt-1">
            Course Insights &amp; Preferences
          </h1>
          <PageHeaderBand />
          <p className="text-sm font-body text-text-muted mt-1 max-w-2xl leading-relaxed">
            Your personal repository of professor expectations, exam rules, case hints, and study tips. Automatically retrieved and referenced during AI tutoring.
          </p>
        </div>

        <button
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-[2px] bg-sindoor text-white font-body text-xs font-semibold shadow-xs hover:bg-sindoor/90 transition-colors shrink-0"
        >
          <Plus size={14} />
          <span>New Memory Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-[3px] border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search memories by keyword, source, or course..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-[2px] border border-border/80 bg-bg pl-9 pr-4 py-2 font-body text-xs text-text focus:outline-none focus:border-sindoor"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-[2px] border border-border/80 bg-bg px-3 py-2 font-mono text-xs text-text focus:outline-none focus:border-sindoor"
            >
              <option value="all">All Departments</option>
              <option value="general">General / Degree-wide</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-[2px] border border-border/80 bg-bg px-3 py-2 font-mono text-xs text-text focus:outline-none focus:border-sindoor"
            >
              <option value="all">All Types</option>
              <option value="PROFESSOR_PREFERENCE">Professor Preference</option>
              <option value="PERSONAL_RULE">Personal Rule</option>
              <option value="PAST_MISTAKE">Past Mistake</option>
              <option value="WEAK_CONCEPT">Weak Concept</option>
              <option value="DEADLINE">Deadline Rule</option>
              <option value="GROUP_INFO">Group Info</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs font-mono">
          <button
            type="button"
            onClick={() => handleSelectAll(filtered)}
            className="inline-flex items-center space-x-1.5 text-text-muted hover:text-text"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare size={14} className="text-sindoor" />
            ) : (
              <Square size={14} />
            )}
            <span>Select All ({filtered.length})</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[2px] bg-sindoor/10 text-sindoor border border-sindoor/30 font-semibold hover:bg-sindoor/20 transition-colors"
            >
              <Trash2 size={13} />
              <span>Bulk Delete ({selectedIds.size}) Selected</span>
            </button>
          )}
        </div>
      </div>

      {/* Memory Items Grouped by Subject */}
      {filtered.length === 0 ? (
        <EmptyState
          motif={<Brain size={64} className="text-turmeric" />}
          title="No Memories Match Query"
          message="Record instructor expectations or syllabus rules to build the long-term context memory of your degree."
          actionText="Create First Memory"
          onAction={() => setIsNewOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBySubject).map(([subjectGroup, groupMemories]) => (
            <div key={subjectGroup} className="space-y-3">
              <h2 className="font-heading text-xl text-text border-b border-border/60 pb-2 flex items-center justify-between">
                <span>{subjectGroup}</span>
                <span className="font-mono text-xs text-text-muted font-normal">
                  {groupMemories.length} entries
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupMemories.map((m) => {
                  const isChecked = selectedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`rounded-[3px] border bg-surface p-4 flex flex-col justify-between space-y-3 transition-colors ${
                        isChecked ? "border-sindoor/80 bg-sindoor/5" : "border-border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(m.id)}
                              className="text-text-muted hover:text-text"
                            >
                              {isChecked ? (
                                <CheckSquare size={14} className="text-sindoor" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-bg border border-border/60 text-text-muted">
                              {m.type.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMemory(m)}
                              className="p-1 text-text-muted hover:text-text"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(m.id)}
                              className="p-1 text-text-muted hover:text-sindoor"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-body text-text leading-relaxed">
                          {m.content}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-text-muted">
                        <span className="truncate max-w-[200px]" title={m.source || ""}>
                          Source: {m.source || "Direct note"}
                        </span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Memory Modal */}
      {editingMemory && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingMemory(null)}
          title="Edit Memory Entry"
          description="Update this durable rule or expectation"
        >
          <div className="space-y-4 font-body text-xs">
            <div>
              <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
                Content
              </label>
              <textarea
                rows={3}
                value={editingMemory.content}
                onChange={(e) =>
                  setEditingMemory({ ...editingMemory, content: e.target.value })
                }
                className="w-full rounded-[2px] border border-border bg-bg p-2 text-xs text-text focus:outline-none focus:border-sindoor"
              />
            </div>
            <div>
              <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
                Type
              </label>
              <select
                value={editingMemory.type}
                onChange={(e) =>
                  setEditingMemory({ ...editingMemory, type: e.target.value })
                }
                className="w-full rounded-[2px] border border-border bg-bg p-2 font-mono text-xs text-text"
              >
                <option value="PROFESSOR_PREFERENCE">Professor Preference</option>
                <option value="PERSONAL_RULE">Personal Rule</option>
                <option value="PAST_MISTAKE">Past Mistake</option>
                <option value="WEAK_CONCEPT">Weak Concept</option>
                <option value="DEADLINE">Deadline Rule</option>
                <option value="GROUP_INFO">Group Info</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                className="px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-[2px] bg-sindoor text-white font-mono text-xs uppercase tracking-wider font-semibold hover:bg-sindoor/90"
              >
                Update Memory
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* New Memory Modal */}
      <Dialog
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Record Durable Memory"
        description="Add a durable insight to You Inc.'s long-term memory store"
      >
        <div className="space-y-4 font-body text-xs">
          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Department
            </label>
            <select
              value={newSubjId}
              onChange={(e) => setNewSubjId(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-bg p-2 font-mono text-xs text-text"
            >
              <option value="">General Degree Rule (No Department)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Memory Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-bg p-2 font-mono text-xs text-text"
            >
              <option value="PROFESSOR_PREFERENCE">Professor Preference</option>
              <option value="PERSONAL_RULE">Personal Rule</option>
              <option value="PAST_MISTAKE">Past Mistake</option>
              <option value="WEAK_CONCEPT">Weak Concept</option>
              <option value="DEADLINE">Deadline Rule</option>
              <option value="GROUP_INFO">Group Info</option>
            </select>
          </div>

          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Source / Provenance
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="e.g. Session 2 Discussion / Syllabus"
              className="w-full rounded-[2px] border border-border bg-bg p-2 text-xs text-text focus:outline-none focus:border-sindoor"
            />
          </div>

          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Memory Insight (Privacy Filtered)
            </label>
            <textarea
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="e.g. Professor wants numerical justification in all financial valuations."
              className="w-full rounded-[2px] border border-border bg-bg p-2 text-xs text-text focus:outline-none focus:border-sindoor"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNew}
              className="px-4 py-1.5 rounded-[2px] bg-sindoor text-white font-mono text-xs uppercase tracking-wider font-semibold hover:bg-sindoor/90"
            >
              Commit Memory
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MemoryVaultClient;
