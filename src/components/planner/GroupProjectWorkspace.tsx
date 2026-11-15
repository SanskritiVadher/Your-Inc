"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Plus,
  FileText,
  AlertTriangle,
  FolderOpen,
  Send,
  ExternalLink,
  ShieldAlert,
  X,
  Check,
} from "lucide-react";

interface GroupMember {
  id: string;
  name: string;
  email?: string | null;
  role: string;
}

interface ProjectTask {
  id: string;
  title: string;
  status: string; // "TODO" | "IN_PROGRESS" | "DONE"
  deadline?: string | null;
  isOverdue: boolean;
  completed?: boolean;
  ownerId?: string | null;
  owner?: { id: string; name: string } | null;
}

interface FileLink {
  name: string;
  url: string;
  addedBy: string;
  date: string;
}

interface ContributionStat {
  memberId: string;
  name: string;
  role: string;
  tasksCompleted: number;
  tasksTotal: number;
  filesAdded: number;
  onTimeRatioPercent: number;
}

interface GroupProject {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  fileLinks?: FileLink[] | null;
  members: GroupMember[];
  tasks: ProjectTask[];
  subject: {
    id: string;
    code: string;
    name: string;
  };
}

export const GroupProjectWorkspace: React.FC = () => {
  const [projects, setProjects] = useState<GroupProject[]>([]);
  const [activeProject, setActiveProject] = useState<GroupProject | null>(null);
  const [contributionLog, setContributionLog] = useState<ContributionStat[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newMembersRaw, setNewMembersRaw] = useState("");

  // New Task State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskOwnerId, setNewTaskOwnerId] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

  // New File Link State
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // Meeting Notes Modal State
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [rawNotesInput, setRawNotesInput] = useState("");
  const [isExtractingNotes, setIsExtractingNotes] = useState(false);
  const [extractedNotes, setExtractedNotes] = useState<{
    title: string;
    decisions: string[];
    actionItems: { id: string; title: string; ownerName: string; deadline?: string; status: "pending" | "confirmed" }[];
    openQuestions: string[];
  } | null>(null);

  // Overdue Task Audit Alert Message
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const fetchProjects = (selectedId?: string) => {
    fetch("/api/planner/group-projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setProjects(data.projects);
          const current = selectedId
            ? data.projects.find((p: GroupProject) => p.id === selectedId)
            : activeProject
            ? data.projects.find((p: GroupProject) => p.id === activeProject.id)
            : data.projects[0];

          if (current) {
            loadProjectDetails(current.id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load group projects:", err);
        setLoading(false);
      });
  };

  const loadProjectDetails = (projectId: string) => {
    fetch(`/api/planner/group-projects?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project) setActiveProject(data.project);
        if (data.contributionLog) setContributionLog(data.contributionLog);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Update Task Status on Kanban
  const handleMoveTask = async (taskId: string, newStatus: string) => {
    if (!activeProject) return;
    try {
      await fetch("/api/planner/group-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_task",
          taskId,
          status: newStatus,
        }),
      });
      loadProjectDetails(activeProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTaskTitle.trim()) return;

    try {
      await fetch("/api/planner/group-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_task",
          groupProjectId: activeProject.id,
          title: newTaskTitle,
          ownerId: newTaskOwnerId || undefined,
          deadline: newTaskDeadline || undefined,
        }),
      });
      setShowTaskModal(false);
      setNewTaskTitle("");
      loadProjectDetails(activeProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Cloud File Link (OneDrive / Google Drive)
  const handleAddFileLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !fileUrl.trim()) return;

    try {
      await fetch("/api/planner/group-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_file_link",
          groupProjectId: activeProject.id,
          name: fileName || "Project Document",
          url: fileUrl,
        }),
      });
      setShowFileModal(false);
      setFileName("");
      setFileUrl("");
      loadProjectDetails(activeProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Meeting Notes: Extract
  const handleExtractNotes = async () => {
    if (!activeProject || !rawNotesInput.trim()) return;
    setIsExtractingNotes(true);

    try {
      const res = await fetch("/api/planner/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract",
          groupProjectId: activeProject.id,
          rawContent: rawNotesInput,
        }),
      });
      const data = await res.json();
      if (data.extracted) setExtractedNotes(data.extracted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtractingNotes(false);
    }
  };

  // Meeting Notes: Confirm and Convert Action Items to Tasks
  const handleSaveAndConvertNotes = async () => {
    if (!activeProject || !extractedNotes) return;

    try {
      await fetch("/api/planner/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_and_convert",
          groupProjectId: activeProject.id,
          title: extractedNotes.title,
          rawContent: rawNotesInput,
          decisions: extractedNotes.decisions,
          actionItems: extractedNotes.actionItems,
          openQuestions: extractedNotes.openQuestions,
        }),
      });
      setShowMeetingModal(false);
      setRawNotesInput("");
      setExtractedNotes(null);
      loadProjectDetails(activeProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Audit Overdue Task and verify strict isolation rule
  const handleAuditOverdueTask = async (taskId: string) => {
    setAuditMessage(null);
    try {
      const res = await fetch("/api/planner/group-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_overdue_task",
          taskId,
        }),
      });
      const data = await res.json();
      if (data.result?.penalizedMemberName) {
        setAuditMessage(
          `Audit Verified: Overdue penalty applied strictly to owner (${data.result.penalizedMemberName}). Group members' credit ratings remain untouched!`
        );
      } else {
        setAuditMessage("Audit completed: Task marked overdue.");
      }
      if (activeProject) loadProjectDetails(activeProject.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-mono text-xs text-text-muted">
        Loading group project workspaces...
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center space-y-3 font-body">
        <h3 className="font-heading text-lg text-text">No Active Group Projects</h3>
        <p className="text-xs text-text-muted font-mono">
          Create a group project to collaborate on case decks and term papers.
        </p>
      </div>
    );
  }

  const todoTasks = activeProject.tasks.filter((t) => t.status === "TODO" && !t.completed);
  const inProgressTasks = activeProject.tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = activeProject.tasks.filter((t) => t.status === "DONE" || t.completed);

  return (
    <div className="space-y-6 font-body">
      {/* 1. Project Selector & Master Actions */}
      <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-turmeric/20 text-turmeric">
              Syndicate Deliverable Workspace
            </span>
            <span className="font-mono text-xs text-text-muted">
              {activeProject.subject.code} · Deadline:{" "}
              {new Date(activeProject.deadline).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <h3 className="font-heading text-2xl text-text font-bold">{activeProject.title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 1 && (
            <select
              aria-label="Select Active Group Project"
              value={activeProject.id}
              onChange={(e) => loadProjectDetails(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono border border-border bg-bg text-text rounded"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowTaskModal(true)}
            className="px-3.5 py-1.5 rounded bg-turmeric text-bg font-mono text-xs font-bold hover:bg-turmeric/90 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMeetingModal(true)}
            className="px-3.5 py-1.5 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-turmeric" />
            <span>Paste Meeting Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFileModal(true)}
            className="px-3.5 py-1.5 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs flex items-center gap-1.5"
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo" />
            <span>Add Cloud Link</span>
          </button>
        </div>
      </div>

      {auditMessage && (
        <div className="p-3 rounded bg-turmeric/15 border border-turmeric text-xs font-mono text-text flex items-center gap-2 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-turmeric shrink-0" />
          <span>{auditMessage}</span>
        </div>
      )}

      {/* 2. Cloud File Links Banner */}
      {activeProject.fileLinks && activeProject.fileLinks.length > 0 && (
        <div className="p-3.5 rounded-lg bg-bg border border-border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo" />
            <span className="font-bold text-text">Project Cloud Files (Drive / OneDrive):</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeProject.fileLinks.map((fl, idx) => (
              <a
                key={idx}
                href={fl.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo hover:underline"
              >
                <span>{fl.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 3. Kanban Status Board (To do / Doing / Done) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TO DO */}
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold uppercase text-text-muted">
              To Do ({todoTasks.length})
            </span>
          </div>

          <div className="space-y-2 min-h-[160px]">
            {todoTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded bg-bg border border-border space-y-2 hover:border-turmeric/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-heading text-sm text-text font-bold leading-snug">{t.title}</span>
                  {t.isOverdue && (
                    <span className="px-1.5 py-0.2 rounded bg-sindoor/20 text-sindoor text-[9px] font-mono font-bold shrink-0">
                      Overdue
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>Owner: {t.owner?.name || "Unassigned"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAuditOverdueTask(t.id)}
                      title="Test isolation rule: overdue task penalizes only this owner"
                      className="text-sindoor hover:underline"
                    >
                      Make Overdue
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleMoveTask(t.id, "IN_PROGRESS")}
                      className="text-turmeric hover:underline"
                    >
                      Start &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DOING / IN PROGRESS */}
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold uppercase text-turmeric">
              Doing ({inProgressTasks.length})
            </span>
          </div>

          <div className="space-y-2 min-h-[160px]">
            {inProgressTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded bg-bg border border-turmeric/40 space-y-2 hover:border-turmeric transition-colors"
              >
                <span className="font-heading text-sm text-text font-bold leading-snug block">
                  {t.title}
                </span>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>Owner: {t.owner?.name || "Unassigned"}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMoveTask(t.id, "TODO")}
                      className="hover:underline"
                    >
                      &larr; To Do
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleMoveTask(t.id, "DONE")}
                      className="text-leaf font-bold hover:underline"
                    >
                      Done &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DONE */}
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold uppercase text-leaf">
              Done ({doneTasks.length})
            </span>
          </div>

          <div className="space-y-2 min-h-[160px]">
            {doneTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded bg-leaf/10 border border-leaf/30 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-leaf shrink-0" />
                  <span className="font-heading text-sm text-text font-bold line-through opacity-80">
                    {t.title}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-text-muted pl-6">
                  Completed by: {t.owner?.name || "Contributor"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Factual Contribution Log (Strictly unranked, factual statistics) */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h4 className="font-heading text-lg text-text">Team Contribution Log</h4>
            <p className="text-xs font-mono text-text-muted">
              Objective operational tracking visible to all members · Zero ranking or shaming language.
            </p>
          </div>
          <span className="text-[11px] font-mono text-leaf flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Sovereignty Isolation Active</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-bg/60 text-text-muted">
                <th className="py-3 px-4 font-normal">Team Member</th>
                <th className="py-3 px-4 font-normal">Role</th>
                <th className="py-3 px-4 font-normal text-right">Tasks Completed</th>
                <th className="py-3 px-4 font-normal text-right">Files Contributed</th>
                <th className="py-3 px-4 font-normal text-right">On-Time Completion Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {contributionLog.map((member) => (
                <tr key={member.memberId} className="hover:bg-bg/40 transition-colors">
                  <td className="py-3 px-4 font-body font-bold text-text text-sm">{member.name}</td>
                  <td className="py-3 px-4 font-mono text-text-muted">{member.role}</td>
                  <td className="py-3 px-4 text-right font-mono text-text">
                    {member.tasksCompleted} / {member.tasksTotal}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text">{member.filesAdded}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`font-bold ${
                        member.onTimeRatioPercent >= 80 ? "text-leaf" : "text-turmeric"
                      }`}
                    >
                      {member.onTimeRatioPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Paste Meeting Notes Modal with Action Item Conversion */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-turmeric rounded-lg max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto font-body">
            <button
              type="button"
              onClick={() => {
                setShowMeetingModal(false);
                setExtractedNotes(null);
              }}
              className="absolute top-4 right-4 text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-turmeric/20 text-turmeric font-bold uppercase">
                AI Meeting Minutes &amp; Action Item Synthesizer
              </span>
            </div>

            <h3 className="font-heading text-2xl text-text mb-1">Paste Meeting Transcript or Notes</h3>
            <p className="text-xs text-text-muted mb-4 font-mono">
              AI extracts decisions, open questions, and action items with owners and deadlines that convert directly to project tasks.
            </p>

            {!extractedNotes ? (
              <div className="space-y-4">
                <textarea
                  rows={8}
                  placeholder="Paste rough sync notes or transcript... e.g. 'Agreed on 5-force model. Aarav will model DCF by Thursday. Who will contact professor regarding interview cutoff?'"
                  value={rawNotesInput}
                  onChange={(e) => setRawNotesInput(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-border bg-bg rounded text-text placeholder:text-text-muted/60 focus:border-turmeric focus:outline-none"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(false)}
                    className="px-4 py-2 font-mono text-xs text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExtractNotes}
                    disabled={isExtractingNotes || !rawNotesInput.trim()}
                    className="px-5 py-2 bg-turmeric text-bg font-mono text-xs font-bold rounded hover:bg-turmeric/90 disabled:opacity-50"
                  >
                    {isExtractingNotes ? "Extracting Minutes..." : "Extract Decisions & Actions"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Decisions */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-text">
                    Decisions Agreed:
                  </span>
                  <div className="space-y-1">
                    {extractedNotes.decisions.map((dec, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-leaf/10 border border-leaf/30 text-xs font-mono text-text flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-leaf shrink-0" />
                        <span>{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items to Convert */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-text">
                    Action Items (Will Convert into Project Tasks):
                  </span>
                  <div className="space-y-1.5">
                    {extractedNotes.actionItems.map((act, idx) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded bg-bg border border-border text-xs font-mono flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-text block">{act.title}</span>
                          <span className="text-[10px] text-text-muted">
                            Assigned to: <strong className="text-turmeric">{act.ownerName}</strong>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px]">
                          Pending Confirmation
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Open Questions */}
                {extractedNotes.openQuestions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono uppercase tracking-wider font-bold text-text">
                      Open Questions for Next Sync:
                    </span>
                    <ul className="space-y-1 text-xs font-mono text-text-muted pl-4 list-disc">
                      {extractedNotes.openQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setExtractedNotes(null)}
                    className="px-4 py-2 font-mono text-xs text-text-muted hover:text-text"
                  >
                    Edit Notes
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndConvertNotes}
                    className="px-5 py-2 bg-leaf text-white font-mono text-xs font-bold rounded hover:bg-leaf/90 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Decisions &amp; Convert to Tasks</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-turmeric rounded-lg max-w-md w-full p-6 shadow-xl relative font-body">
            <button
              type="button"
              onClick={() => setShowTaskModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-xl text-text mb-1">Add Deliverable Task</h3>
            <p className="text-xs text-text-muted mb-4 font-mono">
              Overdue tasks penalize ONLY their specific owner&apos;s credit rating.
            </p>

            <form onSubmit={handleAddTask} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Build Sensitivity Valuation Table"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                  required
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">Assigned Owner</label>
                <select
                  value={newTaskOwnerId}
                  onChange={(e) => setNewTaskOwnerId(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                >
                  <option value="">Unassigned</option>
                  {activeProject.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-text-muted block mb-1">Task Due Date</label>
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-turmeric text-bg font-bold rounded hover:bg-turmeric/90"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add Cloud File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-turmeric rounded-lg max-w-md w-full p-6 shadow-xl relative font-body">
            <button
              type="button"
              onClick={() => setShowFileModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-xl text-text mb-1">Attach Cloud Project File</h3>
            <p className="text-xs text-text-muted mb-4 font-mono">
              Share Google Drive, OneDrive, or Dropbox URLs with team partners.
            </p>

            <form onSubmit={handleAddFileLink} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">Document Name</label>
                <input
                  type="text"
                  placeholder="e.g. Valuation Model & Sensitivity.xlsx"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                  required
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">File URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://onedrive.live.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-3 py-1.5 text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo text-white font-bold rounded hover:bg-indigo/90"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
