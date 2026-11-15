"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InterviewPrepModal } from "./InterviewPrepModal";

export interface ProjectVaultItem {
  id: string;
  title: string;
  problem: string | null;
  role: string | null;
  method: string | null;
  tools: string | null;
  outcome: string | null;
  metric: string | null;
  teamSize: number | null;
  resumeBullet: string | null;
  starStory: unknown;
  linkedInDesc: string | null;
  approved: boolean;
  isPublic: boolean;
  isSignature?: boolean;
  createdAt: string;
}

interface ProjectVaultViewProps {
  projects: ProjectVaultItem[];
  onRefresh: () => void;
}

export function ProjectVaultView({ projects, onRefresh }: ProjectVaultViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("Error toggling signature project:", e);
    }
  };

  // Form states
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [role, setRole] = useState("Lead Contributor");
  const [method, setMethod] = useState("");
  const [tools, setTools] = useState("");
  const [outcome, setOutcome] = useState("");
  const [metric, setMetric] = useState("");
  const [teamSize, setTeamSize] = useState<number | "">("");

  // AI draft preview states
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{
    resumeBullet: string;
    starStory: { situation: string; task: string; action: string; result: string };
    linkedInDesc: string;
    hasMetric: boolean;
    metricNotice?: string;
  } | null>(null);

  // Student editable fields on draft
  const [editedBullet, setEditedBullet] = useState("");
  const [editedLinkedIn, setEditedLinkedIn] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !outcome.trim()) return;

    try {
      setDrafting(true);
      const res = await fetch("/api/career/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          title,
          problem,
          role,
          method,
          tools,
          outcome,
          metric: metric.trim() || undefined,
          teamSize: teamSize ? Number(teamSize) : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to draft artifacts");
      const json = await res.json();
      setDraftResult(json.artifacts);
      setEditedBullet(json.artifacts.resumeBullet);
      setEditedLinkedIn(json.artifacts.linkedInDesc);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error drafting artifacts");
    } finally {
      setDrafting(false);
    }
  };

  const handleSaveAndApprove = async (approveFinal: boolean) => {
    try {
      setSaving(true);
      const res = await fetch("/api/career/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          title,
          problem,
          role,
          method,
          tools,
          outcome,
          metric: metric.trim() || undefined,
          teamSize: teamSize ? Number(teamSize) : undefined,
          resumeBullet: editedBullet || draftResult?.resumeBullet,
          starStory: draftResult?.starStory,
          linkedInDesc: editedLinkedIn || draftResult?.linkedInDesc,
        }),
      });

      if (!res.ok) throw new Error("Failed to save project");
      const json = await res.json();

      if (approveFinal && json.project?.id) {
        await fetch("/api/career/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            projectId: json.project.id,
            editedResumeBullet: editedBullet,
            editedLinkedInDesc: editedLinkedIn,
          }),
        });
      }

      setIsAddOpen(false);
      setDraftResult(null);
      resetForm();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving project");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveExisting = async (projectId: string) => {
    try {
      const res = await fetch("/api/career/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          projectId,
        }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to remove this project from your Career Vault?")) return;
    try {
      const res = await fetch("/api/career/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          projectId,
        }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setProblem("");
    setRole("Lead Contributor");
    setMethod("");
    setTools("");
    setOutcome("");
    setMetric("");
    setTeamSize("");
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.isSignature && !b.isSignature) return -1;
    if (!a.isSignature && b.isSignature) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Authentic Deliverables
            </span>
            <span className="font-body text-xs text-text-muted">No Hallucinated Metrics</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Project Vault & Resume Synthesis
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Log your course case studies, consulting simulations, and internships. AI generates resume
            bullets, STAR stories, and LinkedIn descriptions without inventing fake metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPrepModalOpen(true)}
            className="font-body text-xs flex items-center gap-1.5 shrink-0"
          >
            <Sparkles size={14} className="text-turmeric" /> Prepare for Interview
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsAddOpen(true);
              setDraftResult(null);
            }}
            className="font-mono text-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Log New Project
          </Button>
        </div>
      </div>

      {/* Projects List */}
      {sortedProjects.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center bg-paper-sunken">
          <Briefcase size={36} className="mx-auto text-text-muted mb-3" />
          <h4 className="font-heading text-lg text-text">No Projects Logged Yet</h4>
          <p className="text-xs text-text-muted font-body max-w-md mx-auto mt-1 mb-5">
            Document class projects and consulting deliverables. We turn authentic work into structured
            resume bullets and STAR interview stories.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            className="font-mono text-xs"
          >
            Log First Project
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProjects.map((proj) => {
            const isExpanded = expandedId === proj.id;
            const star = proj.starStory as {
              situation?: string;
              task?: string;
              action?: string;
              result?: string;
            } | null;

            return (
              <div
                key={proj.id}
                className={`border p-5 space-y-4 transition-all ${
                  proj.isSignature
                    ? "border-leaf/60 bg-leaf/5 shadow-2xs"
                    : "border-border bg-paper"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-paper-sunken border border-border font-mono text-[10px] uppercase text-text font-bold">
                        {proj.role || "Contributor"}
                      </span>
                      {proj.isSignature && (
                        <span className="px-2 py-0.5 bg-leaf/15 border border-leaf/40 text-leaf font-body text-[10px] font-semibold flex items-center gap-1 rounded">
                          <Star size={11} className="fill-leaf" /> Signature Project
                        </span>
                      )}
                      {proj.approved ? (
                        <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-terracotta/10 border border-terracotta/30 text-terracotta font-mono text-[10px] font-bold">
                          Draft (Pending Approval)
                        </span>
                      )}
                      {proj.metric && (
                        <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px]">
                          Metric: {proj.metric}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-xl font-medium text-text mt-1.5">
                      {proj.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Pin/Unpin Signature Project */}
                    <button
                      type="button"
                      onClick={() => handleToggleSignature(proj.id)}
                      className={`p-1.5 rounded border transition-colors ${
                        proj.isSignature
                          ? "border-leaf/50 bg-leaf/15 text-leaf"
                          : "border-border text-text-muted hover:text-text hover:bg-surface"
                      }`}
                      title={proj.isSignature ? "Pinned Signature Project" : "Pin as Signature Project"}
                    >
                      <Star size={14} className={proj.isSignature ? "fill-leaf" : ""} />
                    </button>

                    {!proj.approved && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveExisting(proj.id)}
                        className="font-mono text-[11px] py-1 px-2.5 flex items-center gap-1"
                      >
                        <Check size={12} /> Approve Artifacts
                      </Button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : proj.id)}
                      className="font-mono text-xs text-text-muted hover:text-text p-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="text-text-muted hover:text-terracotta p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Resume Bullet */}
                {proj.resumeBullet && (
                  <div className="p-3 bg-paper-sunken border border-border text-xs font-body text-text leading-relaxed">
                    <span className="font-mono text-[10px] uppercase text-text-muted font-bold block mb-1">
                      Resume Action Bullet
                    </span>
                    &bull; {proj.resumeBullet}
                  </div>
                )}

                {/* Expanded Details: STAR Story & LinkedIn Description */}
                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {star && (
                      <div>
                        <span className="font-mono text-[10px] uppercase text-text-muted font-bold block mb-2">
                          STAR Interview Story Framework
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-body">
                          <div className="p-2.5 bg-paper border border-border">
                            <strong className="font-mono text-[10px] text-text-muted uppercase block">Situation</strong>
                            <p className="mt-0.5 text-text">{star.situation}</p>
                          </div>
                          <div className="p-2.5 bg-paper border border-border">
                            <strong className="font-mono text-[10px] text-text-muted uppercase block">Task</strong>
                            <p className="mt-0.5 text-text">{star.task}</p>
                          </div>
                          <div className="p-2.5 bg-paper border border-border">
                            <strong className="font-mono text-[10px] text-text-muted uppercase block">Action</strong>
                            <p className="mt-0.5 text-text">{star.action}</p>
                          </div>
                          <div className="p-2.5 bg-paper border border-border">
                            <strong className="font-mono text-[10px] text-text-muted uppercase block">Result</strong>
                            <p className="mt-0.5 text-text font-medium">{star.result}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {proj.linkedInDesc && (
                      <div className="p-3 bg-paper border border-border text-xs font-body text-text leading-relaxed">
                        <span className="font-mono text-[10px] uppercase text-text-muted font-bold block mb-1">
                          2-Line LinkedIn Featured Copy
                        </span>
                        <p className="whitespace-pre-line">{proj.linkedInDesc}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Log New Project & AI Synthesis */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-paper border border-border w-full max-w-2xl p-6 space-y-4 my-8">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Career Vault
              </span>
              <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                Log Project / Case / Internship
              </h3>
              <p className="text-xs text-text-muted font-body mt-1">
                Provide real project details. AI will draft executive resume bullets and STAR stories.
                You retain complete editorial control before approval.
              </p>
            </div>

            {!draftResult ? (
              <form onSubmit={handleGenerateDraft} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-xs text-text-muted mb-1">
                      Project / Case Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Zepto Quick-Commerce Supply Chain Optimization"
                      className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-text-muted mb-1">
                      Your Specific Role
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Lead Analyst, Strategy Consultant"
                      className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-text-muted mb-1">
                      Team Size
                    </label>
                    <input
                      type="number"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 4"
                      className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1">
                    Problem Solved *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="e.g. High dark-store fulfillment latency during peak rain hours leading to 18% order cancellation."
                    className="w-full bg-paper border border-border p-2 font-body text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-xs text-text-muted mb-1">
                      Methodology Applied
                    </label>
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      placeholder="e.g. Linear programming, bottleneck analysis, dynamic dispatch"
                      className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-text-muted mb-1">
                      Tools Used
                    </label>
                    <input
                      type="text"
                      value={tools}
                      onChange={(e) => setTools(e.target.value)}
                      placeholder="e.g. Python, Excel Solver, SQL, Figma"
                      className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1">
                    Outcome Delivered *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="e.g. Redesigned dark-store inventory picking layout and staged courier routing."
                    className="w-full bg-paper border border-border p-2 font-body text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>

                <div className="p-3 bg-paper-sunken border border-border space-y-1">
                  <label className="block font-mono text-xs text-text font-bold">
                    Quantified Metric (Optional real outcome)
                  </label>
                  <input
                    type="text"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    placeholder="e.g. 14% reduction in dispatch time, saving ₹12L monthly"
                    className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                  />
                  <span className="text-[10px] font-mono text-text-muted block">
                    Zero-Hallucination Policy: If blank, AI will never invent numbers.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddOpen(false)}
                    className="font-mono text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={drafting}
                    className="font-mono text-xs flex items-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    {drafting ? "Drafting..." : "Generate AI Drafts"}
                  </Button>
                </div>
              </form>
            ) : (
              /* REVIEW & EDIT DRAFT STAGE */
              <div className="space-y-4">
                {draftResult.metricNotice && (
                  <div className="p-3 bg-paper-sunken border border-border text-xs font-mono text-text-muted flex items-start gap-2">
                    <AlertTriangle size={15} className="text-turmeric shrink-0 mt-0.5" />
                    <span>{draftResult.metricNotice}</span>
                  </div>
                )}

                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1 font-bold">
                    (a) Review & Edit Resume Bullet
                  </label>
                  <textarea
                    rows={3}
                    value={editedBullet}
                    onChange={(e) => setEditedBullet(e.target.value)}
                    className="w-full bg-paper border border-border p-2.5 font-body text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-xs text-text-muted font-bold">
                    (b) STAR Story (Situation, Task, Action, Result)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-body">
                    <div className="p-2 bg-paper-sunken border border-border">
                      <strong className="font-mono text-[10px] text-text-muted block">Situation</strong>
                      <p>{draftResult.starStory.situation}</p>
                    </div>
                    <div className="p-2 bg-paper-sunken border border-border">
                      <strong className="font-mono text-[10px] text-text-muted block">Task</strong>
                      <p>{draftResult.starStory.task}</p>
                    </div>
                    <div className="p-2 bg-paper-sunken border border-border">
                      <strong className="font-mono text-[10px] text-text-muted block">Action</strong>
                      <p>{draftResult.starStory.action}</p>
                    </div>
                    <div className="p-2 bg-paper-sunken border border-border">
                      <strong className="font-mono text-[10px] text-text-muted block">Result</strong>
                      <p>{draftResult.starStory.result}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1 font-bold">
                    (c) Review & Edit 2-Line LinkedIn Description
                  </label>
                  <textarea
                    rows={2}
                    value={editedLinkedIn}
                    onChange={(e) => setEditedLinkedIn(e.target.value)}
                    className="w-full bg-paper border border-border p-2.5 font-body text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDraftResult(null)}
                    className="font-mono text-xs"
                  >
                    &larr; Back to Inputs
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSaveAndApprove(false)}
                      className="font-mono text-xs"
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSaveAndApprove(true)}
                      className="font-mono text-xs flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Approve & Save Final
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interview Prep Across Semesters Modal */}
      <InterviewPrepModal
        isOpen={isPrepModalOpen}
        onClose={() => setIsPrepModalOpen(false)}
      />
    </div>
  );
}
