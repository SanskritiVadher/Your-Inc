"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Sparkles,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Check,
  ChevronDown,
  X,
  Send,
} from "lucide-react";

interface Subject {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface ChecklistItem {
  item: string;
  done: boolean;
}

interface AssignmentItem {
  id: string;
  title: string;
  subjectId: string;
  subject: Subject;
  deadline: string;
  deliverableFormat: string;
  progress: number;
  customStatus: string;
  weight: number;
  riskScore: number;
  daysLeft: number;
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  checklist: ChecklistItem[];
  briefText?: string | null;
}

export const AssignmentManager: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"risk" | "deadline" | "progress">("risk");

  // Quick Add State
  const [quickAddInput, setQuickAddInput] = useState("");
  const [isParsingQuickAdd, setIsParsingQuickAdd] = useState(false);
  const [quickAddPreview, setQuickAddPreview] = useState<{
    title: string;
    matchedSubjectCode?: string;
    deliverableFormat?: string;
    deadline: string;
    weight: number;
  } | null>(null);

  // Brief Parser Modal State
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefTextInput, setBriefTextInput] = useState("");
  const [isParsingBrief, setIsParsingBrief] = useState(false);
  const [briefPreview, setBriefPreview] = useState<{
    title: string;
    deliverables: string[];
    formatRules: string[];
    pageOrWordLimit?: string;
    checklist: ChecklistItem[];
    suggestedDeliverableFormat?: string;
  } | null>(null);

  const fetchAssignments = () => {
    fetch(`/api/planner/assignments?sortBy=${sortBy}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.assignments) setAssignments(json.assignments);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load assignments:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAssignments();
  }, [sortBy]);

  // Handle Natural Language Quick Add preview
  const handleQuickAddPreview = async () => {
    if (!quickAddInput.trim()) return;
    setIsParsingQuickAdd(true);

    try {
      const res = await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick_add_preview",
          input: quickAddInput,
        }),
      });
      const data = await res.json();
      if (data.parsed) {
        setQuickAddPreview(data.parsed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingQuickAdd(false);
    }
  };

  // Confirm and Create Quick Add Assignment
  const handleConfirmQuickAdd = async () => {
    if (!quickAddPreview) return;

    try {
      const res = await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: quickAddPreview.title,
          subjectCode: quickAddPreview.matchedSubjectCode,
          deadline: quickAddPreview.deadline,
          deliverableFormat: quickAddPreview.deliverableFormat,
          weight: quickAddPreview.weight,
        }),
      });
      if (res.ok) {
        setQuickAddInput("");
        setQuickAddPreview(null);
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Brief Parsing
  const handleParseBrief = async () => {
    if (!briefTextInput.trim()) return;
    setIsParsingBrief(true);

    try {
      const res = await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_brief",
          briefText: briefTextInput,
        }),
      });
      const data = await res.json();
      if (data.extracted) {
        setBriefPreview(data.extracted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingBrief(false);
    }
  };

  // Confirm Brief Creation
  const handleConfirmBriefCreation = async () => {
    if (!briefPreview) return;

    try {
      const res = await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: briefPreview.title,
          deliverableFormat: briefPreview.suggestedDeliverableFormat,
          checklist: briefPreview.checklist,
          briefText: briefTextInput,
          weight: 20.0,
        }),
      });
      if (res.ok) {
        setShowBriefModal(false);
        setBriefTextInput("");
        setBriefPreview(null);
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle checklist item done
  const handleToggleChecklist = async (assignment: AssignmentItem, index: number) => {
    const updatedChecklist = [...assignment.checklist];
    updatedChecklist[index].done = !updatedChecklist[index].done;

    const doneCount = updatedChecklist.filter((c) => c.done).length;
    const progress = Math.round((doneCount / updatedChecklist.length) * 100);

    const customStatus =
      progress === 100
        ? "Submitted"
        : progress > 70
        ? "Review"
        : progress > 0
        ? "In progress"
        : "Not started";

    try {
      await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: assignment.id,
          checklist: updatedChecklist,
          progress,
          customStatus,
        }),
      });
      fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  // Update status directly
  const handleUpdateStatus = async (assignmentId: string, status: string) => {
    const progress = status === "Submitted" ? 100 : status === "Review" ? 80 : status === "In progress" ? 40 : 0;
    try {
      await fetch("/api/planner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: assignmentId,
          customStatus: status,
          progress,
        }),
      });
      fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* 1. Quick Add & Brief Intake Bar */}
      <div className="p-4 sm:p-5 rounded-lg border-2 border-turmeric/60 bg-surface shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-turmeric" />
            <h3 className="font-heading text-lg text-text">Intelligent Deliverable Intake</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowBriefModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-turmeric/80 hover:bg-turmeric/10 text-turmeric text-xs font-mono font-bold transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Assignment Brief / Guidelines</span>
          </button>
        </div>

        {/* Natural Language Input */}
        <div>
          <label className="text-xs font-mono text-text-muted block mb-1">
            Natural Language Quick Add (e.g. &ldquo;Marketing deck due Friday 5pm, 10 slides&rdquo;)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Corporate Finance DCF model due Friday 5pm, Excel & 5 pages"
              value={quickAddInput}
              onChange={(e) => setQuickAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAddPreview();
              }}
              className="flex-1 px-3.5 py-2 text-xs font-mono border border-border bg-bg rounded text-text placeholder:text-text-muted/60 focus:border-turmeric focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickAddPreview}
              disabled={isParsingQuickAdd || !quickAddInput.trim()}
              className="px-4 py-2 bg-turmeric text-bg font-mono text-xs font-bold rounded hover:bg-turmeric/90 transition-colors shrink-0 disabled:opacity-50"
            >
              {isParsingQuickAdd ? "Reading details..." : "Fill Details"}
            </button>
          </div>
        </div>

        {/* Quick Add Parsed Preview Confirmation */}
        {quickAddPreview && (
          <div className="p-4 rounded-lg bg-bg border border-turmeric/70 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono text-turmeric font-bold">
              <span>Parsed Deliverable Proposal</span>
              <button
                type="button"
                onClick={() => setQuickAddPreview(null)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 rounded bg-surface border border-border">
                <span className="text-[10px] text-text-muted block">Title</span>
                <span className="text-text font-bold truncate block">{quickAddPreview.title}</span>
              </div>
              <div className="p-2 rounded bg-surface border border-border">
                <span className="text-[10px] text-text-muted block">Department</span>
                <span className="text-turmeric font-bold block">
                  {quickAddPreview.matchedSubjectCode || "General"}
                </span>
              </div>
              <div className="p-2 rounded bg-surface border border-border">
                <span className="text-[10px] text-text-muted block">Format</span>
                <span className="text-text font-bold block">{quickAddPreview.deliverableFormat}</span>
              </div>
              <div className="p-2 rounded bg-surface border border-border">
                <span className="text-[10px] text-text-muted block">Deadline</span>
                <span className="text-text font-bold block">
                  {new Date(quickAddPreview.deadline).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuickAddPreview(null)}
                className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickAdd}
                className="px-4 py-1.5 bg-leaf hover:bg-leaf/90 text-white font-mono text-xs font-bold rounded flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm &amp; Capitalize Deliverable</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Assignments Table Header & Sorter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl text-text">Deliverables &amp; Coursework</h3>
          <p className="text-xs font-mono text-text-muted">
            Deadline Risk Score = Weight × (1 − Progress) ÷ Days Left
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted">Sort By:</span>
          <div className="inline-flex rounded border border-border bg-surface p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSortBy("risk")}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === "risk" ? "bg-turmeric text-bg font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              Risk Score
            </button>
            <button
              type="button"
              onClick={() => setSortBy("deadline")}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === "deadline" ? "bg-turmeric text-bg font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              Due Date
            </button>
            <button
              type="button"
              onClick={() => setSortBy("progress")}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === "progress" ? "bg-turmeric text-bg font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              Progress
            </button>
          </div>
        </div>
      </div>

      {/* 3. Assignments List */}
      {loading ? (
        <div className="p-8 border border-border rounded-lg bg-surface text-center font-mono text-xs text-text-muted">
          Checking active course deliverables &amp; deadlines...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-8 border border-border rounded-lg bg-surface text-center space-y-2">
          <p className="font-heading text-lg text-text">No Deliverables Added</p>
          <p className="font-mono text-xs text-text-muted">
            Add an assignment using natural language or paste a course brief above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const isCritical = assignment.urgencyLevel === "CRITICAL";
            const isHigh = assignment.urgencyLevel === "HIGH";

            return (
              <div
                key={assignment.id}
                className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs hover:border-turmeric/60 transition-all space-y-3"
              >
                {/* Top Row: Department, Title, Risk Badge, Format */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-bg border border-border text-text">
                        {assignment.subject.code}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        Weight: {assignment.weight}% of course grade
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-turmeric/10 text-turmeric font-bold">
                        Format: {assignment.deliverableFormat}
                      </span>
                    </div>
                    <h4 className="font-heading text-lg sm:text-xl text-text font-bold">
                      {assignment.title}
                    </h4>
                  </div>

                  {/* Risk Badge & Deadline */}
                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div>
                      <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${
                            isCritical ? "text-sindoor" : isHigh ? "text-turmeric" : "text-leaf"
                          }`}
                        />
                        <span
                          className={`font-bold ${
                            isCritical ? "text-sindoor" : isHigh ? "text-turmeric" : "text-leaf"
                          }`}
                        >
                          Risk: {assignment.riskScore.toFixed(1)}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-text-muted block mt-0.5">
                        {assignment.daysLeft <= 0
                          ? "Due today or overdue!"
                          : `${assignment.daysLeft} days remaining`}
                      </span>
                    </div>

                    {/* Status Dropdown */}
                    <select
                      aria-label="Assignment Status"
                      value={assignment.customStatus}
                      onChange={(e) => handleUpdateStatus(assignment.id, e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-mono border border-border bg-bg text-text rounded focus:border-turmeric focus:outline-none"
                    >
                      <option value="Not started">Not started</option>
                      <option value="In progress">In progress</option>
                      <option value="Review">Review</option>
                      <option value="Submitted">Submitted</option>
                    </select>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-text-muted">
                    <span>Deliverable Execution Progress</span>
                    <span className="font-bold text-text">{assignment.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        assignment.progress === 100
                          ? "bg-leaf"
                          : isCritical
                          ? "bg-sindoor"
                          : "bg-turmeric"
                      }`}
                      style={{ width: `${assignment.progress}%` }}
                    />
                  </div>
                </div>

                {/* Checklist items */}
                {assignment.checklist && assignment.checklist.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                      Deliverable Checklist
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignment.checklist.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleChecklist(assignment, idx)}
                          className={`p-2 rounded text-left text-xs font-mono flex items-start gap-2 border transition-colors ${
                            item.done
                              ? "bg-leaf/10 border-leaf/30 text-leaf line-through opacity-80"
                              : "bg-bg border-border text-text hover:border-turmeric/60"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 ${
                              item.done ? "border-leaf bg-leaf text-white" : "border-border bg-surface"
                            }`}
                          >
                            {item.done && <Check className="w-3 h-3" />}
                          </span>
                          <span className="leading-snug">{item.item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Assignment Brief & Rubric Extraction Modal */}
      {showBriefModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-turmeric rounded-lg max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto font-body">
            <button
              type="button"
              onClick={() => {
                setShowBriefModal(false);
                setBriefPreview(null);
              }}
              className="absolute top-4 right-4 text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-turmeric/20 text-turmeric font-bold uppercase">
                AI Brief &amp; Deliverables Extractor
              </span>
            </div>

            <h3 className="font-heading text-2xl text-text mb-1">
              Paste Assignment Brief or Case Prompt
            </h3>
            <p className="text-xs text-text-muted mb-4 font-mono">
              Extracts required deliverables, page/word limits, formatting constraints, and an actionable checklist.
            </p>

            {!briefPreview ? (
              <div className="space-y-4">
                <textarea
                  rows={8}
                  placeholder="Paste syllabus prompt, case questions, or assignment guidelines here..."
                  value={briefTextInput}
                  onChange={(e) => setBriefTextInput(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-border bg-bg rounded text-text placeholder:text-text-muted/60 focus:border-turmeric focus:outline-none"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBriefModal(false)}
                    className="px-4 py-2 font-mono text-xs text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseBrief}
                    disabled={isParsingBrief || !briefTextInput.trim()}
                    className="px-5 py-2 bg-turmeric text-bg font-mono text-xs font-bold rounded hover:bg-turmeric/90 disabled:opacity-50"
                  >
                    {isParsingBrief ? "Reading guidelines..." : "Create Checklist"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3.5 rounded bg-bg border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-text-muted">Detected Assignment Title:</span>
                    <span className="font-bold text-text">{briefPreview.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-text-muted">Recommended Format:</span>
                    <span className="font-bold text-turmeric">{briefPreview.suggestedDeliverableFormat}</span>
                  </div>
                </div>

                {/* Format Rules */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-text">
                    Extracted Formatting Rules &amp; Limits:
                  </span>
                  <ul className="space-y-1 text-xs font-mono text-text-muted">
                    {briefPreview.formatRules.map((rule, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-turmeric" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Checklist */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-text">
                    Generated Step-by-Step Deliverables Checklist:
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {briefPreview.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-bg border border-border text-xs font-mono text-text flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-turmeric shrink-0" />
                        <span>{item.item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setBriefPreview(null)}
                    className="px-4 py-2 font-mono text-xs text-text-muted hover:text-text"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBriefCreation}
                    className="px-5 py-2 bg-leaf text-white font-mono text-xs font-bold rounded hover:bg-leaf/90 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Create Assignment with Checklist</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
