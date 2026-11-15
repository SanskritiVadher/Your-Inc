"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Building,
  Trophy,
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Flame,
  CheckCircle,
} from "lucide-react";

interface SquadMemberSummary {
  id: string;
  role: string;
  companyName: string;
  activityLevel: string;
  weeklyContribution: number;
  isOptedIn: boolean;
  sharePrice: number | null;
}

interface SquadData {
  id: string;
  name: string;
  code: string;
  conglomerateIndex: number;
  weeklyRecoveredValue: number;
  members: SquadMemberSummary[];
}

interface TakeoverBid {
  id: string;
  name: string;
  conglomerateIndex: number;
  weeklyRecoveredValue: number;
  memberCount: number;
}

export const StudySquadView: React.FC = () => {
  const [inSquad, setInSquad] = useState<boolean>(false);
  const [squad, setSquad] = useState<SquadData | null>(null);
  const [takeoverBids, setTakeoverBids] = useState<TakeoverBid[]>([]);
  const [currentMember, setCurrentMember] = useState<{
    id: string;
    role: string;
    isPublic: boolean;
    activityLevel: string;
    weeklyContribution: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingOptIn, setTogglingOptIn] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>("");
  const [newSquadName, setNewSquadName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSquad = () => {
    fetch("/api/economy/squad")
      .then((res) => res.json())
      .then((json) => {
        setInSquad(json.inSquad);
        setSquad(json.squad);
        setTakeoverBids(json.takeoverBids || []);
        setCurrentMember(json.currentMember || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch squad:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSquad();
  }, []);

  const handleToggleOptIn = async () => {
    setTogglingOptIn(true);
    try {
      const res = await fetch("/api/economy/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_opt_in" }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSquad();
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg("Failed to update privacy preference");
    } finally {
      setTogglingOptIn(false);
    }
  };

  const handleJoinOrCreate = async (action: "join" | "create") => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/economy/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: joinCode,
          name: newSquadName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSquad();
      } else {
        setErrorMsg(data.error || "Failed to complete action");
      }
    } catch {
      setErrorMsg("Network error connecting to squad syndicate");
    }
  };

  if (loading) {
    return (
      <div className="p-8 border border-border rounded-lg bg-surface text-center font-mono text-xs text-text-muted">
        Auditing Study Squad conglomerate indexes...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      {/* Top Banner: Conglomerate Overview or Join Squad */}
      {!inSquad || !squad ? (
        <div className="p-6 bg-surface border-2 border-turmeric/60 rounded-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-turmeric/20 text-turmeric flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-2xl text-text">Form a Conglomerate Syndicate</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto mt-1 font-mono">
              3 to 6 learners unite as a holding conglomerate. Combine your sovereign indexes and enter the weekly Takeover Bid challenge. Individual scores stay private by default.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-sindoor/10 border border-sindoor/30 text-xs font-mono text-sindoor max-w-sm mx-auto">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Invite Code (e.g. SQ-ALPHA)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="px-3 py-2 text-xs font-mono border border-border bg-bg rounded text-text placeholder:text-text-muted/60"
              />
              <button
                type="button"
                onClick={() => handleJoinOrCreate("join")}
                className="px-4 py-2 bg-turmeric text-bg font-mono text-xs font-bold rounded hover:bg-turmeric/90"
              >
                Join Syndicate
              </button>
            </div>

            <span className="font-mono text-xs text-text-muted">or</span>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Syndicate Name"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="px-3 py-2 text-xs font-mono border border-border bg-bg rounded text-text placeholder:text-text-muted/60"
              />
              <button
                type="button"
                onClick={() => handleJoinOrCreate("create")}
                className="px-4 py-2 border border-turmeric text-turmeric font-mono text-xs font-bold rounded hover:bg-turmeric/10"
              >
                Found Syndicate
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Active Squad Conglomerate Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 bg-surface/95 border-2 border-turmeric/60 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-turmeric/20 text-turmeric">
                      Study Squad Syndicate
                    </span>
                    <span className="font-mono text-xs text-text-muted">Code: {squad.code}</span>
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {squad.members.length} / 6 Partners
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mt-2">
                  <h3 className="font-heading text-3xl text-text">{squad.name}</h3>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-heading text-4xl text-turmeric">
                    {Math.round(squad.conglomerateIndex)}%
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    Squad Combined Mastery
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/70 flex flex-wrap items-center justify-between text-xs font-mono text-text-muted gap-2">
                <div>
                  Calculated from members&apos; chartered course subjects.
                </div>
                <div className="flex items-center gap-1.5 text-turmeric">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Privacy Shield Active</span>
                </div>
              </div>
            </div>

            {/* Weekly Study Challenge Standings */}
            <div className="p-5 bg-surface border border-border rounded-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-text">
                  <Trophy className="w-4 h-4 text-turmeric" />
                  <span className="font-heading text-base font-bold">Weekly Study Challenge</span>
                </div>
                <p className="text-xs font-body text-text-muted mt-1 leading-snug">
                  Study groups compete to <strong>gain the most recall strength</strong> through regular review sessions.
                </p>

                <div className="mt-3 p-3 rounded bg-bg border border-border font-mono text-xs space-y-1">
                  <div className="text-text-muted text-[10px] uppercase">This Week Strength Gained</div>
                  <div className="font-heading text-2xl text-leaf font-bold">
                    +{Math.round(squad.weeklyRecoveredValue)} pts
                  </div>
                  <div className="text-[10px] text-text-muted">Reinvested across all partners</div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-text-muted mt-2 pt-2 border-t border-border/70">
                Resets every Sunday at 23:59 IST.
              </div>
            </div>
          </div>

          {/* Member Roster & Privacy Control */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-heading text-lg text-text">Syndicate Partner Roster</h4>
                <p className="text-xs font-mono text-text-muted">
                  Strict privacy: Individual mastery and scores are never broadcast without consent.
                </p>
              </div>

              {/* Opt-In Privacy Toggle for Current User */}
              {currentMember && (
                <button
                  type="button"
                  onClick={handleToggleOptIn}
                  disabled={togglingOptIn}
                  className="px-3.5 py-1.5 rounded border border-border hover:border-turmeric bg-bg text-text font-mono text-xs flex items-center gap-2 transition-colors shrink-0"
                >
                  {currentMember.isPublic ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-turmeric" />
                      <span>Individual Score: Visible to Squad</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-text-muted" />
                      <span>Individual Score: Hidden (Strict Privacy)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-bg/60 text-text-muted">
                    <th className="py-3 px-4 font-normal">Partner / Student</th>
                    <th className="py-3 px-4 font-normal">Role</th>
                    <th className="py-3 px-4 font-normal">Activity Cadence</th>
                    <th className="py-3 px-4 font-normal text-right">Weekly Strength Gained</th>
                    <th className="py-3 px-4 font-normal text-right">Mastery Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {squad.members.map((member) => (
                    <tr key={member.id} className="hover:bg-bg/40 transition-colors">
                      <td className="py-3 px-4 font-body">
                        <div className="font-bold text-text text-sm">{member.companyName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-text-muted">{member.role}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-bg border border-border text-text">
                          {member.activityLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-leaf">
                        +{Math.round(member.weeklyContribution)} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {member.isOptedIn && member.sharePrice !== null ? (
                          <span className="text-text font-bold">{Math.round(member.sharePrice)}%</span>
                        ) : (
                          <span className="text-text-muted/70 italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3 inline" />
                            [Private]
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-bg/50 border-t border-border/70 text-[11px] font-mono text-text-muted flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-turmeric shrink-0" />
              <span>
                Zero public individual leaderboards. Peer accountability is built on mutual mastery and group defense against forgetting.
              </span>
            </div>
          </div>

          {/* Cohort-wide Study Challenge Leaderboard */}
          {takeoverBids.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-turmeric" />
                  <span className="font-heading text-base text-text">Class Study Challenge Standings</span>
                </div>
                <span className="text-xs font-mono text-text-muted">Top Squads by Strength Gained</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {takeoverBids.map((bid, i) => (
                  <div
                    key={bid.id}
                    className={`p-3 rounded border font-mono text-xs ${
                      bid.id === squad.id
                        ? "bg-turmeric/10 border-turmeric text-text"
                        : "bg-bg border-border text-text-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase">Rank #{i + 1}</span>
                      <span className="text-[10px]">{bid.memberCount} members</span>
                    </div>
                    <div className="font-heading text-sm text-text font-bold truncate mt-1">
                      {bid.name}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-leaf font-bold">+{Math.round(bid.weeklyRecoveredValue)} pts</span>
                      <span className="text-[10px] text-text-muted">Mastery {Math.round(bid.conglomerateIndex)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
