"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Plus, Trash2, ArrowRight, Merge, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ExtractedConcept {
  tempId: string;
  name: string;
  unit: string;
  definition: string;
  suggestMerge?: boolean;
  matchedConceptId?: string;
  matchedConceptName?: string;
  similarity?: number;
  mergeConfirmed?: boolean;
}

interface ProposedMemory {
  type: string;
  content: string;
  source: string;
  subjectId?: string;
  reason: string;
}

interface SyllabusUploaderProps {
  subjectId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const SyllabusUploader: React.FC<SyllabusUploaderProps> = ({
  subjectId,
  onSuccess,
  onClose,
}) => {
  const { success, error: toastError, info } = useToast();

  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Review screen stage
  const [stage, setStage] = useState<"input" | "review">("input");
  const [concepts, setConcepts] = useState<ExtractedConcept[]>([]);
  const [memories, setMemories] = useState<ProposedMemory[]>([]);
  const [acceptedMemories, setAcceptedMemories] = useState<Record<number, boolean>>({});

  const handleExtract = async () => {
    if (mode === "paste" && !pastedText.trim()) {
      toastError("Please paste your syllabus or course outline text");
      return;
    }
    if (mode === "upload" && !selectedFile) {
      toastError("Please choose a PDF or DOCX syllabus document");
      return;
    }

    setIsProcessing(true);
    try {
      let res: Response;

      if (mode === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        res = await fetch(`/api/subjects/${subjectId}/syllabus`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`/api/subjects/${subjectId}/syllabus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: pastedText,
            source: "Pasted Syllabus",
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to read course outline");
      }

      setConcepts(data.concepts || []);
      setMemories(data.proposedMemories || []);
      setStage("review");
      info(`Extracted ${data.concepts?.length || 0} candidate concepts for review`);
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateConcept = (idx: number, field: "name" | "definition", val: string) => {
    const updated = [...concepts];
    updated[idx][field] = val;
    setConcepts(updated);
  };

  const handleRemoveConcept = (idx: number) => {
    setConcepts(concepts.filter((_, i) => i !== idx));
  };

  const handleToggleMerge = (idx: number) => {
    const updated = [...concepts];
    updated[idx].mergeConfirmed = !updated[idx].mergeConfirmed;
    setConcepts(updated);
  };

  const handleAddManualConcept = () => {
    setConcepts([
      ...concepts,
      {
        tempId: `cand_${Math.random().toString(36).substring(2, 9)}`,
        name: "New Framework",
        unit: "Manual Addition",
        definition: "One-line definition of this business framework.",
      },
    ]);
  };

  const handleAcceptMemory = async (mem: ProposedMemory, idx: number) => {
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: mem.content,
          type: mem.type,
          subjectId: subjectId,
          source: mem.source,
        }),
      });
      if (res.ok) {
        setAcceptedMemories((prev) => ({ ...prev, [idx]: true }));
        success("Saved to persistent memory", mem.content.substring(0, 45) + "...");
      }
    } catch (e) {
      toastError("Failed to save memory");
    }
  };

  const handleCommitConcepts = async () => {
    if (concepts.length === 0) {
      toastError("No concepts selected for saving");
      return;
    }

    setIsCommitting(true);
    try {
      const payload = concepts.map((c) => ({
        name: c.name,
        definition: c.definition,
        mergeIntoId: c.mergeConfirmed && c.matchedConceptId ? c.matchedConceptId : undefined,
      }));

      const res = await fetch(`/api/subjects/${subjectId}/concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit concepts");
      }

      success("Topics Saved", `Successfully added ${data.savedCount} topics!`);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {stage === "input" ? (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex border-b border-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-4 py-2 font-medium font-body text-xs border-b-2 -mb-[2px] transition-colors ${
                mode === "paste"
                  ? "border-sindoor text-sindoor font-semibold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              Paste syllabus text
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-4 py-2 font-medium font-body text-xs border-b-2 -mb-[2px] transition-colors ${
                mode === "upload"
                  ? "border-sindoor text-sindoor font-semibold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              Upload document (PDF / DOCX)
            </button>
          </div>

          {mode === "paste" ? (
            <div>
              <label className="block text-xs font-body font-medium text-text-muted mb-1.5">
                Course outline / Syllabus text
              </label>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste course overview, weekly modules, units, or reading list here...&#10;&#10;e.g.&#10;Unit 1: Capital Budgeting & Cash Flow&#10;• Discounted Cash Flow: Valuation model discounting future cash flows at WACC.&#10;• Net Present Value: Net monetary value added by a capital project.&#10;Professor expects all case presentations in 3 concise bullet points."
                className="w-full rounded-[3px] border border-border bg-bg/50 p-3 font-body text-xs text-text focus:outline-none focus:border-sindoor"
              />
            </div>
          ) : (
            <div className="rounded-[3px] border-2 border-dashed border-border p-8 text-center bg-bg/40 hover:bg-bg/60 transition-colors">
              <Upload size={32} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs font-body text-text">
                {selectedFile ? selectedFile.name : "Select syllabus PDF or DOCX file"}
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="mt-3 block mx-auto text-xs font-body text-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-[2px] file:border file:border-border file:text-xs file:font-body file:bg-surface file:text-text hover:file:bg-bg"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExtract}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-[2px] bg-sindoor text-white text-xs font-body font-semibold shadow-xs hover:bg-sindoor/90 transition-all disabled:opacity-50"
            >
              <span>{isProcessing ? "Reading syllabus..." : "Extract Units & Topics"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* ================= REVIEW SCREEN BEFORE COMMITTING ================= */
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-heading text-xl text-text">Review Concept Assets</h3>
              <p className="text-xs text-text-muted font-body">
                Verify definitions and merge candidates. Nothing is added to your course without your confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddManualConcept}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[2px] border border-border text-xs font-body font-medium text-text hover:bg-bg"
            >
              <Plus size={13} />
              <span>Add Concept</span>
            </button>
          </div>

          {/* Proposed Memories Chips Row */}
          {memories.length > 0 && (
            <div className="p-3.5 rounded-[3px] border border-turmeric/60 bg-turmeric/10 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono text-text font-semibold">
                <Sparkles size={14} className="text-turmeric" />
                <span>Proposed Durable Memory Entries ({memories.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {memories.map((mem, mIdx) => (
                  <div
                    key={mIdx}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-[2px] border border-border bg-surface text-xs font-body shadow-xs"
                  >
                    <span className="text-[11px] font-body px-1.5 py-0.5 rounded bg-bg text-text-muted">
                      {mem.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-text line-clamp-1 max-w-xs">{mem.content}</span>
                    {acceptedMemories[mIdx] ? (
                      <span className="text-leaf text-xs font-mono flex items-center gap-1">
                        <CheckCircle2 size={13} /> Saved
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcceptMemory(mem, mIdx)}
                        className="text-[11px] font-mono text-sindoor hover:underline font-semibold"
                      >
                        Save?
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Concepts List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {concepts.length === 0 ? (
              <p className="text-xs font-mono text-text-muted italic py-4 text-center">
                No concepts in review. Add one manually or re-extract from syllabus.
              </p>
            ) : (
              concepts.map((concept, idx) => (
                <div
                  key={concept.tempId || idx}
                  className={`p-3.5 rounded-[3px] border bg-surface space-y-2 transition-colors ${
                    concept.suggestMerge
                      ? "border-turmeric/70 bg-turmeric/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-body text-text-muted px-1.5 py-0.5 rounded bg-bg border border-border/60">
                          {concept.unit || "General"}
                        </span>
                        {concept.suggestMerge && (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-turmeric font-semibold">
                            <AlertTriangle size={12} />
                            <span>
                              Similar to &ldquo;{concept.matchedConceptName}&rdquo; (
                              {Math.round((concept.similarity || 0.9) * 100)}% match)
                            </span>
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={concept.name}
                        onChange={(e) => handleUpdateConcept(idx, "name", e.target.value)}
                        className="w-full font-heading text-base font-normal text-text bg-transparent border-b border-transparent hover:border-border focus:border-sindoor focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {concept.suggestMerge && (
                        <button
                          type="button"
                          onClick={() => handleToggleMerge(idx)}
                          className={`px-2.5 py-1 rounded-[2px] border text-xs font-mono flex items-center space-x-1 transition-colors ${
                            concept.mergeConfirmed
                              ? "border-turmeric bg-turmeric text-white font-semibold"
                              : "border-turmeric text-turmeric hover:bg-turmeric/10"
                          }`}
                        >
                          <Merge size={12} />
                          <span>{concept.mergeConfirmed ? "Merge Approved" : "Suggest Merge"}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveConcept(idx)}
                        className="p-1 text-text-muted hover:text-sindoor"
                        title="Remove concept"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={concept.definition}
                    onChange={(e) => handleUpdateConcept(idx, "definition", e.target.value)}
                    className="w-full rounded-[2px] border border-border/60 bg-bg/40 p-2 text-xs font-body text-text focus:outline-none focus:border-sindoor"
                    placeholder="One-line definition in simple language..."
                  />
                </div>
              ))
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStage("input")}
              className="font-mono text-xs text-text-muted hover:text-text"
            >
              Back to Input
            </button>
            <button
              type="button"
              disabled={isCommitting || concepts.length === 0}
              onClick={handleCommitConcepts}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-[2px] bg-sindoor text-white text-xs font-body font-semibold shadow-xs hover:bg-sindoor/90 transition-all disabled:opacity-40"
            >
              <CheckCircle2 size={15} />
              <span>{isCommitting ? "Saving topics..." : `Confirm and save (${concepts.length}) topics`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusUploader;
