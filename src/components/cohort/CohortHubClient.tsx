"use client";

import React, { useState } from "react";
import {
  Users,
  Share2,
  Copy,
  Check,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Plus,
  Trash2,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

import { useRouter } from "next/navigation";

interface CohortData {
  id: string;
  name: string;
  program: string;
  year: number;
  inviteCode: string | null;
  inviteLinkExpiry: string | null;
  maxMembers: number;
  monthlyAiCap: number;
  isAdmin: boolean;
  membersCount: number;
  members: Array<{
    userId: string;
    name: string;
    role: string;
    creditRating: string;
    joinedAt: string;
  }>;
  sharedDecks: Array<{
    id: string;
    deckId: string;
    title: string;
    slideCount: number;
    subjectCode: string;
    sharedBy: string;
    sharedAt: string;
  }>;
  timetable: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
    room: string | null;
  }>;
  deadlines: Array<{
    id: string;
    title: string;
    subjectCode: string;
    dueDate: string;
    weight: number;
    format: string;
  }>;
}

interface CohortHubClientProps {
  cohorts: CohortData[];
  onRefresh?: () => void;
}

export function CohortHubClient({ cohorts, onRefresh }: CohortHubClientProps) {
  const router = useRouter();
  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    router.refresh();
  };
  const [selectedCohortIndex, setSelectedCohortIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"library" | "schedule" | "roster" | "admin">("library");

  // Share deck modal states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareDeckId, setShareDeckId] = useState("");
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Add deadline modal
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineSubject, setDeadlineSubject] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  // Copy code notification
  const [copiedCode, setCopiedCode] = useState(false);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const cohort = cohorts[selectedCohortIndex];

  const handleCopyInviteLink = () => {
    if (!cohort?.inviteCode) return;
    const url = `${window.location.origin}/cohort/join?code=${cohort.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRegenerateCode = async () => {
    if (!cohort) return;
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate_code", cohortId: cohort.id }),
      });
      if (res.ok) handleRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdoptDeck = async (deckId: string) => {
    try {
      setAdoptingId(deckId);
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adopt_deck", deckId }),
      });
      if (res.ok) {
        const json = await res.json();
        alert(`Deck saved! ${json.cardsCreatedCount} review cards added to ${json.subjectCode}.`);
        handleRefresh();
      }
    } catch (e) {
      alert("Something went wrong. Try again.");
    } finally {
      setAdoptingId(null);
    }
  };

  const handleHideItem = async (itemId: string, itemType: "TIMETABLE" | "DEADLINE") => {
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide_item", itemId, itemType }),
      });
      if (res.ok) handleRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort || !deadlineTitle.trim() || !deadlineDate) return;
    try {
      setSavingDeadline(true);
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_deadline",
          cohortId: cohort.id,
          title: deadlineTitle,
          subjectCode: deadlineSubject || "CORE",
          dueDate: deadlineDate,
        }),
      });
      if (res.ok) {
        setIsDeadlineOpen(false);
        setDeadlineTitle("");
        setDeadlineDate("");
        handleRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDeadline(false);
    }
  };

  if (!cohort) {
    return (
      <div className="border border-dashed border-border p-10 text-center bg-paper-sunken space-y-3">
        <Users size={36} className="mx-auto text-text-muted" />
        <h3 className="font-heading text-xl text-text">Not in a Class Group</h3>
        <p className="text-xs text-text-muted font-body max-w-md mx-auto">
          Join your class to unlock shared lecture decks, class schedules, and study groups.
        </p>
        <a
          href="/cohort/join"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-leaf text-white font-mono text-xs hover:bg-leaf/90 transition-colors"
        >
          Join Class &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cohort Header Card */}
      <div className="border border-border bg-paper p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-bold">
                {cohort.program} SECTION &bull; CLASS OF {cohort.year}
              </span>
              {cohort.isAdmin && (
                <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] font-bold">
                  Section Admin
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl text-text font-normal mt-1">
              {cohort.name}
            </h1>
            <p className="text-xs text-text-muted font-mono mt-0.5">
              {cohort.membersCount} of {cohort.maxMembers} students enrolled &bull; Monthly AI Cap: ${cohort.monthlyAiCap.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInviteLink}
              className="font-mono text-xs flex items-center gap-1.5"
            >
              {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              {copiedCode ? "Link Copied!" : `Class Code: ${cohort.inviteCode}`}
            </Button>

            {cohort.isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateCode}
                className="font-mono text-xs"
              >
                Regenerate Link
              </Button>
            )}
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-border font-mono text-xs pt-2">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "library"
                ? "border-leaf text-text font-bold bg-paper-sunken"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <BookOpen size={13} />
            Shared Decks ({cohort.sharedDecks.length})
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "schedule"
                ? "border-leaf text-text font-bold bg-paper-sunken"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Calendar size={13} />
            Common Schedule ({cohort.deadlines.length + cohort.timetable.length})
          </button>

          <button
            onClick={() => setActiveTab("roster")}
            className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "roster"
                ? "border-leaf text-text font-bold bg-paper-sunken"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Users size={13} />
            Class Roster ({cohort.membersCount})
          </button>
        </div>
      </div>

      {/* TAB 1: SHARED DECK LIBRARY */}
      {activeTab === "library" && (
        <div className="border border-border bg-paper p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-heading text-xl text-text font-normal">
                Section Lecture Deck Library
              </h3>
              <p className="text-xs text-text-muted font-body">
                Prepared once by classmates. Saving a deck copies the cards to your personal notes with your own review schedule.
              </p>
            </div>
          </div>

          {cohort.sharedDecks.length === 0 ? (
            <div className="p-8 border border-dashed border-border text-center bg-paper-sunken font-mono text-xs text-text-muted">
              No shared decks uploaded yet. Upload a lecture deck in your library to share it with classmates.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cohort.sharedDecks.map((deck) => (
                <div key={deck.id} className="p-4 border border-border bg-paper-sunken flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
                      <span className="font-bold text-text uppercase px-1.5 py-0.5 bg-paper border border-border">
                        {deck.subjectCode}
                      </span>
                      <span>{deck.slideCount} slides &bull; Shared by {deck.sharedBy}</span>
                    </div>
                    <h4 className="font-heading text-lg font-medium text-text mt-1.5">
                      {deck.title}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between font-mono text-xs">
                    <span className="text-[10px] text-leaf flex items-center gap-1">
                      <Sparkles size={11} /> Ready to Adopt
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={adoptingId === deck.deckId}
                      onClick={() => handleAdoptDeck(deck.deckId)}
                      className="font-mono text-xs"
                    >
                      {adoptingId === deck.deckId ? "Saving..." : "Save to My Notes"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMON SCHEDULE & DEADLINES */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="border border-border bg-paper p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading text-xl text-text font-normal">
                  Common Section Deadlines
                </h3>
                <p className="text-xs text-text-muted font-body">
                  Added by class admin. You can hide any items that do not apply to you.
                </p>
              </div>

              {cohort.isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDeadlineOpen(true)}
                  className="font-mono text-xs flex items-center gap-1"
                >
                  <Plus size={13} /> Add Section Deadline
                </Button>
              )}
            </div>

            {cohort.deadlines.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-text-muted bg-paper-sunken border border-dashed border-border">
                No common class deadlines posted.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border bg-paper">
                {cohort.deadlines.map((dl) => (
                  <div key={dl.id} className="p-3 flex items-center justify-between font-mono text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">{dl.subjectCode}</span>
                        <span className="text-text font-medium">{dl.title}</span>
                      </div>
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        Due: {new Date(dl.dueDate).toLocaleDateString()} &bull; Weight: {dl.weight}% &bull; {dl.format}
                      </span>
                    </div>

                    <button
                      onClick={() => handleHideItem(dl.id, "DEADLINE")}
                      className="text-text-muted hover:text-text flex items-center gap-1 text-[11px]"
                      title="Hide from my schedule"
                    >
                      <EyeOff size={13} /> Hide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ROSTER & SQUADS */}
      {activeTab === "roster" && (
        <div className="border border-border bg-paper p-5 space-y-4">
          <h3 className="font-heading text-xl text-text font-normal">
            Enrolled Classmates ({cohort.members.length})
          </h3>

          <div className="divide-y divide-border border border-border bg-paper">
            {cohort.members.map((mem) => (
              <div key={mem.userId} className="p-3 flex items-center justify-between font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{mem.name}</span>
                    <span className="px-1.5 py-0.5 bg-paper-sunken border border-border text-[10px] text-text-muted">
                      {mem.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    Joined: {new Date(mem.joinedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-bold text-[10px]">
                    Rating: {mem.creditRating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Cohort Deadline */}
      {isDeadlineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <h3 className="font-heading text-xl text-text font-normal">
              Post Section Deliverable
            </h3>
            <form onSubmit={handleAddDeadline} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-text-muted mb-1">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={deadlineTitle}
                  onChange={(e) => setDeadlineTitle(e.target.value)}
                  placeholder="e.g. Valuation Case Memo"
                  className="w-full bg-paper border border-border p-2 text-text"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Course Code</label>
                <input
                  type="text"
                  value={deadlineSubject}
                  onChange={(e) => setDeadlineSubject(e.target.value)}
                  placeholder="e.g. FIN601"
                  className="w-full bg-paper border border-border p-2 text-text uppercase"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full bg-paper border border-border p-2 text-text"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeadlineOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingDeadline}
                >
                  {savingDeadline ? "Posting..." : "Post Deadline"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
