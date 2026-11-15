"use client";

import React, { useState } from "react";
import {
  Calendar,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  Archive,
  Upload,
  BookOpen,
  Award,
  Sparkles,
  Layers,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { BlockPrintDivider } from "@/components/motifs/BlockPrintDivider";

export interface SemesterData {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  isArchived: boolean;
  order: number;
  wrapUp?: any;
  subjects: {
    id: string;
    name: string;
    code: string;
    sharePrice: number;
    keepFresh?: boolean;
    _count?: {
      decks: number;
      concepts: number;
      notes: number;
      assignments: number;
    };
  }[];
  _count?: {
    subjects: number;
    projects: number;
  };
}

interface SemestersSettingsViewProps {
  initialSemesters: SemesterData[];
  initialBlindSpotsEnabled?: boolean;
}

export function SemestersSettingsView({
  initialSemesters,
  initialBlindSpotsEnabled = true,
}: SemestersSettingsViewProps) {
  const [semesters, setSemesters] = useState<SemesterData[]>(initialSemesters);
  const [loading, setLoading] = useState(false);
  const [blindSpotsEnabled, setBlindSpotsEnabled] = useState(initialBlindSpotsEnabled);
  const [updatingBlindSpots, setUpdatingBlindSpots] = useState(false);
  const { success, error: toastError } = useToast();

  const handleToggleBlindSpots = async () => {
    const nextVal = !blindSpotsEnabled;
    setBlindSpotsEnabled(nextVal);
    setUpdatingBlindSpots(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blindSpotsEnabled: nextVal }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      success(
        nextVal ? "Self-Check Insights Enabled" : "Self-Check Insights Hidden",
        nextVal
          ? "Pre-session confidence checks and blind spot insights will now be shown."
          : "Pre-session confidence checks and blind spot insights are now hidden."
      );
    } catch (e: any) {
      setBlindSpotsEnabled(!nextVal);
      toastError("Could not update setting");
    } finally {
      setUpdatingBlindSpots(false);
    }
  };

  // Add / Edit Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsCurrent, setNewIsCurrent] = useState(false);

  // Rename Modal
  const [editingSemester, setEditingSemester] = useState<SemesterData | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Wrap-up modal state
  const [wrapUpModalSemester, setWrapUpModalSemester] = useState<SemesterData | null>(null);
  const [wrapUpData, setWrapUpData] = useState<any>(null);

  // Bulk ZIP Import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSemesterId, setImportSemesterId] = useState<string>(semesters[0]?.id || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/semesters");
      const data = await res.json();
      if (res.ok && data.semesters) {
        setSemesters(data.semesters);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          startDate: newStartDate || undefined,
          endDate: newEndDate || undefined,
          isCurrent: newIsCurrent,
        }),
      });

      if (!res.ok) throw new Error("Failed to create semester");
      success("Semester created", `Added ${newName}`);
      setIsAddOpen(false);
      setNewName("");
      setNewStartDate("");
      setNewEndDate("");
      setNewIsCurrent(false);
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error creating semester");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSemester || !editName.trim()) return;

    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSemester.id,
          name: editName.trim(),
          startDate: editStartDate || null,
          endDate: editEndDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update semester");
      success("Semester updated", editName);
      setEditingSemester(null);
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error updating semester");
    }
  };

  const handleMarkCurrent = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isCurrent: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to mark as current");
      success("Current semester updated", `${name} is now your active semester`);
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error setting current semester");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= semesters.length) return;

    const newSemesters = [...semesters];
    const [moved] = newSemesters.splice(index, 1);
    newSemesters.splice(targetIndex, 0, moved);

    setSemesters(newSemesters);

    try {
      const reorderedIds = newSemesters.map((s) => s.id);
      await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          reorderedIds,
        }),
      });
      success("Semesters reordered");
    } catch (e) {
      console.error(e);
      await fetchSemesters();
    }
  };

  const handleCloseSemester = async (semester: SemesterData) => {
    if (!confirm(`Close ${semester.name}? This will create a 1-page wrap-up and move it to your archive. Nothing will be deleted or locked.`)) {
      return;
    }

    try {
      const res = await fetch("/api/semesters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: semester.id,
          action: "close",
        }),
      });

      if (!res.ok) throw new Error("Failed to close semester");
      const json = await res.json();
      success("Semester archived", `${semester.name} wrapped up successfully`);
      setWrapUpData(json.wrapUp || semester.wrapUp);
      setWrapUpModalSemester(semester);
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error closing semester");
    }
  };

  const handleToggleKeepFresh = async (subjectId: string, currentStatus: boolean, subjectName: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepFresh: !currentStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle keep fresh");
      success(
        !currentStatus ? "Keep fresh enabled" : "Keep fresh disabled",
        `${subjectName} will ${!currentStatus ? "appear for light weekly reviews" : "no longer appear in daily review"}`
      );
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error toggling keep fresh");
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !importSemesterId) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("semesterId", importSemesterId);

      const res = await fetch("/api/semesters/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to import zip file");
      const json = await res.json();
      setImportResult(json);
      success("Import complete", `Processed ${json.totalFiles} files into ${json.semesterName}`);
      setSelectedFile(null);
      await fetchSemesters();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error importing past semester files");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/80 gap-4">
        <div>
          <h2 className="font-heading text-2xl text-text font-normal">
            Academic Semesters
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Add, rename, reorder semesters, set session dates, and archive completed terms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-border bg-surface text-xs font-body font-medium text-text hover:bg-surface-raised transition-colors whitespace-nowrap shrink-0"
          >
            <Upload size={13} />
            <span className="whitespace-nowrap">Bulk ZIP Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-cobalt text-white text-xs font-body font-medium hover:bg-cobalt/90 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Add Semester</span>
          </button>
        </div>
      </div>

      {/* Study Calibration Settings */}
      <div className="p-4 rounded-lg border border-border/80 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-normal text-text">
              Self-Check Insights & Blind Spots
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-leaf/10 text-leaf border border-leaf/20 font-medium">
              Study Calibration
            </span>
          </div>
          <p className="text-xs text-text-muted font-body max-w-lg">
            Asks a quick 1-tap question before review sessions to compare how sure you feel against your actual answer accuracy. Shows gentle summaries after sessions.
          </p>
        </div>

        <button
          type="button"
          disabled={updatingBlindSpots}
          onClick={handleToggleBlindSpots}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            blindSpotsEnabled ? "bg-cobalt" : "bg-border"
          }`}
          role="switch"
          aria-checked={blindSpotsEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              blindSpotsEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Semesters List */}
      <div className="space-y-4">
        {semesters.map((sem, index) => {
          const isFirst = index === 0;
          const isLast = index === semesters.length - 1;

          return (
            <div
              key={sem.id}
              className={`p-5 rounded-lg border transition-all ${
                sem.isCurrent
                  ? "border-leaf/60 bg-leaf/5"
                  : sem.isArchived
                  ? "border-border/60 bg-surface/50 opacity-90"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Semester Title and Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-border/40 text-text font-bold">
                      #{sem.order || index + 1}
                    </span>
                    <h3 className="font-heading text-xl text-text font-medium">
                      {sem.name}
                    </h3>
                    {sem.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-leaf/20 text-leaf text-xs font-medium border border-leaf/40 whitespace-nowrap">
                        Current Semester
                      </span>
                    )}
                    {sem.isArchived && (
                      <span className="px-2 py-0.5 rounded-full bg-turmeric/20 text-turmeric text-xs font-medium border border-turmeric/40 whitespace-nowrap">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-body">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-cobalt" />
                      {sem.startDate && sem.endDate
                        ? `${new Date(sem.startDate).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })} – ${new Date(sem.endDate).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}`
                        : "Dates unscheduled"}
                    </span>
                    <span>·</span>
                    <span>{sem.subjects.length} course subjects</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Reorder Buttons */}
                  <div className="flex items-center rounded border border-border/70 overflow-hidden bg-surface">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleReorder(index, "up")}
                      className="p-1.5 hover:bg-bg disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      title="Move semester up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <div className="w-[1px] h-4 bg-border/60" />
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleReorder(index, "down")}
                      className="p-1.5 hover:bg-bg disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      title="Move semester down"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  {/* Rename / Edit Dates */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSemester(sem);
                      setEditName(sem.name);
                      setEditStartDate(sem.startDate ? sem.startDate.split("T")[0] : "");
                      setEditEndDate(sem.endDate ? sem.endDate.split("T")[0] : "");
                    }}
                    className="p-2 rounded border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
                    title="Rename or update dates"
                  >
                    <Edit2 size={13} />
                  </button>

                  {/* Mark as Current (if not already current) */}
                  {!sem.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleMarkCurrent(sem.id, sem.name)}
                      className="px-3 py-1.5 rounded border border-border bg-surface text-xs font-body font-medium text-text hover:border-leaf/50 hover:text-leaf transition-colors whitespace-nowrap shrink-0"
                    >
                      Set Current
                    </button>
                  )}

                  {/* Close Semester or View Wrap-up */}
                  {!sem.isArchived ? (
                    <button
                      type="button"
                      onClick={() => handleCloseSemester(sem)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-turmeric/40 bg-turmeric/10 text-xs font-body font-medium text-turmeric hover:bg-turmeric/20 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Archive size={13} />
                      <span className="whitespace-nowrap">Close semester</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setWrapUpData(sem.wrapUp);
                        setWrapUpModalSemester(sem);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-cobalt/30 bg-cobalt/10 text-xs font-body font-medium text-cobalt hover:bg-cobalt/20 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FileText size={13} />
                      <span className="whitespace-nowrap">1-Page Wrap-up</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Subjects in this semester */}
              {sem.subjects.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                  <div className="text-[11px] font-body text-text-muted font-medium flex items-center justify-between">
                    <span>Subjects enrolled in {sem.name}:</span>
                    <span>&ldquo;Keep fresh&rdquo; mode (reviews rarely in today&apos;s session)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {sem.subjects.map((subj) => (
                      <div
                        key={subj.id}
                        className="p-2.5 rounded border border-border/60 bg-surface/70 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium text-text truncate">
                            {subj.code} · {subj.name}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            Mastery: {Math.round(subj.sharePrice)}%
                          </div>
                        </div>

                        {/* Keep Fresh Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleKeepFresh(subj.id, subj.keepFresh !== false, subj.name)}
                          className={`px-2 py-1 rounded text-[11px] font-body font-medium transition-colors whitespace-nowrap shrink-0 border ${
                            subj.keepFresh !== false
                              ? "bg-leaf/15 text-leaf border-leaf/40 hover:bg-leaf/25"
                              : "bg-surface text-text-muted border-border hover:text-text"
                          }`}
                          title={
                            subj.keepFresh !== false
                              ? "Keep fresh is ON: Topics appear for spaced light reviews"
                              : "Keep fresh is OFF: No review cards scheduled"
                          }
                        >
                          {subj.keepFresh !== false ? "Fresh ON" : "Fresh OFF"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE SEMESTER MODAL */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Academic Semester"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs font-body">
          <div>
            <label className="block text-text-muted mb-1 font-medium">Semester Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Semester 2, Term 3 — Spring 2026"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2.5 rounded border border-border bg-bg text-text text-sm focus:outline-none focus:border-cobalt"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 font-medium">Start Date</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full p-2 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 font-medium">End Date</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full p-2 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newIsCurrent}
              onChange={(e) => setNewIsCurrent(e.target.checked)}
              className="rounded text-cobalt focus:ring-0"
            />
            <span className="text-text">Mark as Current Semester</span>
          </label>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 rounded border border-border bg-surface text-text hover:bg-surface-raised transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-cobalt text-white font-medium hover:bg-cobalt/90 transition-colors whitespace-nowrap shadow-xs"
            >
              Save Semester
            </button>
          </div>
        </form>
      </Dialog>

      {/* RENAME / EDIT SEMESTER MODAL */}
      <Dialog
        isOpen={Boolean(editingSemester)}
        onClose={() => setEditingSemester(null)}
        title="Edit Semester Details"
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs font-body">
          <div>
            <label className="block text-text-muted mb-1 font-medium">Semester Name *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-2.5 rounded border border-border bg-bg text-text text-sm focus:outline-none focus:border-cobalt"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1 font-medium">Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full p-2 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1 font-medium">End Date</label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full p-2 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingSemester(null)}
              className="px-3.5 py-2 rounded border border-border bg-surface text-text hover:bg-surface-raised transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-cobalt text-white font-medium hover:bg-cobalt/90 transition-colors whitespace-nowrap shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Dialog>

      {/* BULK ZIP IMPORT MODAL */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportResult(null);
        }}
        title="Bulk Import for Past Semesters"
      >
        <div className="space-y-4 text-xs font-body">
          <p className="text-text-muted leading-relaxed">
            Upload a .zip file containing past lecture slide decks (.pdf, .pptx) or lecture notes (.md, .txt).
            Files are automatically organized and catalogued into the selected semester in the background.
          </p>

          <form onSubmit={handleBulkImport} className="space-y-4">
            <div>
              <label className="block text-text-muted mb-1 font-medium">Target Semester</label>
              <select
                value={importSemesterId}
                onChange={(e) => setImportSemesterId(e.target.value)}
                className="w-full p-2.5 rounded border border-border bg-bg text-text focus:outline-none focus:border-cobalt"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCurrent ? "(Current)" : s.isArchived ? "(Archived)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1 font-medium">Choose .ZIP Archive</label>
              <input
                type="file"
                accept=".zip,application/zip"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full p-2 rounded border border-border bg-bg text-text file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-cobalt/15 file:text-cobalt hover:file:bg-cobalt/25"
              />
            </div>

            {importResult && (
              <div className="p-3 rounded border border-leaf/40 bg-leaf/10 space-y-1 text-leaf">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check size={14} />
                  <span>Bulk Import Succeeded!</span>
                </div>
                <div className="text-text leading-relaxed">
                  Imported {importResult.decksCreated} decks and {importResult.notesCreated} notes ({importResult.totalFiles} files total) into {importResult.semesterName}.
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportResult(null);
                }}
                className="px-3.5 py-2 rounded border border-border bg-surface text-text hover:bg-surface-raised transition-colors whitespace-nowrap"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!selectedFile || importing}
                className="px-4 py-2 rounded bg-cobalt text-white font-medium hover:bg-cobalt/90 transition-colors whitespace-nowrap shadow-xs disabled:opacity-40"
              >
                {importing ? "Processing Archive..." : "Start Import"}
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* 1-PAGE WRAP-UP MODAL (CALM HANDMADE JOURNAL FORMAT) */}
      <Dialog
        isOpen={Boolean(wrapUpModalSemester)}
        onClose={() => {
          setWrapUpModalSemester(null);
          setWrapUpData(null);
        }}
        title={`${wrapUpModalSemester?.name || "Semester"} · 1-Page Wrap-Up`}
      >
        <div className="space-y-6 text-xs font-body">
          <div className="p-6 rounded-md bg-[#FBF5E8] dark:bg-[#1A2234] border border-[#E3D6C1] dark:border-border text-text space-y-5 shadow-inner">
            {/* Journal Header */}
            <div className="text-center space-y-1 pb-3 border-b border-border/40">
              <span className="text-xs font-body font-semibold text-cobalt">
                Semester Wrap-Up
              </span>
              <h3 className="font-heading text-2xl text-text font-normal">
                {wrapUpModalSemester?.name} Summary
              </h3>
              <p className="font-handwriting text-xs text-text-muted">
                Closed on {wrapUpData?.closedAt ? new Date(wrapUpData.closedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }) : "Semester conclusion"} · All assets archived safely
              </p>
            </div>

            {/* Section 1: Subjects & Mastery */}
            <div className="space-y-2">
              <h4 className="font-heading text-sm font-medium text-text flex items-center gap-1.5">
                <BookOpen size={14} className="text-cobalt" />
                <span>Enrolled Subjects & Final Mastery</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(wrapUpData?.subjects || wrapUpModalSemester?.subjects || []).map((s: any) => (
                  <div key={s.id} className="p-2.5 rounded bg-surface/70 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-text">{s.code}</span> · {s.name}
                    </div>
                    <span className="text-turquoise font-medium">{s.mastery || Math.round(s.sharePrice || 0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Strongest Topics */}
            {wrapUpData?.strongestTopics && wrapUpData.strongestTopics.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <h4 className="font-heading text-sm font-medium text-text flex items-center gap-1.5">
                  <Award size={14} className="text-turmeric" />
                  <span>Strongest Topics Retained</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {wrapUpData.strongestTopics.map((top: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-surface border border-border/60 text-text text-[11px] flex items-center gap-1"
                    >
                      <span className="text-text-muted font-medium">{top.subjectCode}:</span>
                      <span>{top.name}</span>
                      <span className="text-leaf font-bold">({top.value}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Signature Projects & Deliverables */}
            {wrapUpData?.projects && wrapUpData.projects.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <h4 className="font-heading text-sm font-medium text-text flex items-center gap-1.5">
                  <Layers size={14} className="text-leaf" />
                  <span>Deliverables & Projects Completed</span>
                </h4>
                <div className="space-y-1.5">
                  {wrapUpData.projects.map((proj: any) => (
                    <div key={proj.id} className="p-2 rounded bg-surface/60 border border-border/50 flex items-center justify-between">
                      <span className="font-medium text-text">{proj.title}</span>
                      {proj.metric && <span className="text-text-muted">{proj.metric}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Calm Note */}
            <div className="text-center pt-2 text-[11px] font-handwriting text-text-muted">
              Nothing is locked or deleted. Topics continue in &ldquo;Keep fresh&rdquo; mode.
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setWrapUpModalSemester(null);
                setWrapUpData(null);
              }}
              className="px-4 py-2 rounded bg-cobalt text-white font-medium hover:bg-cobalt/90 transition-colors whitespace-nowrap shadow-xs"
            >
              Done Reading
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
