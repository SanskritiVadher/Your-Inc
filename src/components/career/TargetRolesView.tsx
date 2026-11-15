"use client";

import React, { useState } from "react";
import {
  Target,
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Briefcase,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TargetRole {
  id: string;
  roleName: string;
  targetProficiency: number;
}

interface GapSkill {
  name: string;
  current: number;
  benchmark: number;
  gap: number;
}

interface RoleGapAnalysis {
  roleName: string;
  overallMatchScore: number;
  weakestSkills: GapSkill[];
  gapSummary: string;
}

interface WeeklyPlan {
  weeksRemaining: number;
  isPastStartDate: boolean;
  priorityConceptsToReview: string[];
  mockInterviewsPerWeek: {
    mode: string;
    count: number;
    reason: string;
  }[];
  projectMilestone: string;
  resumeCheckpoint: string;
  strategicNote: string;
}

interface TargetRolesViewProps {
  targetRoles: TargetRole[];
  gapsPerRole: RoleGapAnalysis[];
  placementStartDate: string | null;
  countdown: WeeklyPlan;
  onRefresh: () => void;
}

export function TargetRolesView({
  targetRoles,
  gapsPerRole,
  placementStartDate,
  countdown,
  onRefresh,
}: TargetRolesViewProps) {
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [roleChoices, setRoleChoices] = useState<string[]>(
    targetRoles.map((r) => r.roleName)
  );

  const [dateInput, setDateInput] = useState(
    placementStartDate ? new Date(placementStartDate).toISOString().split("T")[0] : ""
  );
  const [savingDate, setSavingDate] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  const activeGap = gapsPerRole[selectedRoleIndex] || gapsPerRole[0];

  const handleSaveRoles = async () => {
    try {
      setSavingRoles(true);
      const res = await fetch("/api/career/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_roles",
          roles: roleChoices,
        }),
      });
      if (res.ok) {
        setIsEditingRoles(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRoles(false);
    }
  };

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    try {
      setSavingDate(true);
      const res = await fetch("/api/career/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_placement_date",
          date: dateInput,
        }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Placement Countdown Clock & Strategic Mandate */}
      <div className="border border-border bg-paper p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-body text-xs font-semibold text-leaf">
                Placement Countdown Clock
              </span>
              <span className="font-body text-xs text-text-muted">
                Target: {targetRoles.map((r) => r.roleName).join(", ")}
              </span>
            </div>
            <h2 className="font-heading text-3xl text-text font-normal">
              {countdown.weeksRemaining} Weeks to Day-1 Placement
            </h2>
            <p className="text-xs text-text-muted font-body leading-relaxed max-w-xl">
              {countdown.strategicNote}
            </p>
          </div>

          {/* Date Picker Form */}
          <form onSubmit={handleSaveDate} className="flex items-center gap-2 shrink-0">
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-text-muted uppercase">
                Placement Season Kickoff
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="bg-paper-sunken border border-border px-3 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-leaf"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={savingDate}
              className="mt-4 font-mono text-xs"
            >
              {savingDate ? "Updating..." : "Update Date"}
            </Button>
          </form>
        </div>

        {/* Dynamic Weekly Placement Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="bg-paper-sunken p-4 border border-border space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-text">
              <BookOpen size={14} className="text-leaf" />
              <span>Priority Concept Sprints</span>
            </div>
            <p className="text-xs text-text font-body leading-relaxed">
              Review priority concepts in:{" "}
              <strong className="text-text font-mono">
                {countdown.priorityConceptsToReview.join(", ") || "All Core Concepts"}
              </strong>
            </p>
            <a
              href="/review"
              className="font-mono text-[11px] text-leaf hover:underline flex items-center gap-1 mt-2"
            >
              Review Now &rarr;
            </a>
          </div>

          <div className="bg-paper-sunken p-4 border border-border space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-text">
              <Clock size={14} className="text-terracotta" />
              <span>Weekly Mock Target</span>
            </div>
            <div className="space-y-1 text-xs font-mono text-text">
              {countdown.mockInterviewsPerWeek.map((m) => (
                <div key={m.mode} className="flex items-center justify-between">
                  <span>{m.mode} Practice:</span>
                  <span className="font-bold text-leaf">{m.count} per week</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-text-muted block mt-1">
              Adapts dynamically based on score deficits.
            </span>
          </div>

          <div className="bg-paper-sunken p-4 border border-border space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-text">
              <Briefcase size={14} className="text-primary" />
              <span>Vault & Resume Milestones</span>
            </div>
            <p className="text-xs text-text-muted font-body leading-relaxed">
              {countdown.projectMilestone}
            </p>
            <p className="text-[11px] text-text font-mono border-t border-border pt-1 mt-1">
              {countdown.resumeCheckpoint}
            </p>
          </div>
        </div>
      </div>

      {/* Target Roles & Gap Analysis Card */}
      <div className="border border-border bg-paper p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
              Role Profiles & Gap Analysis
            </span>
            <h3 className="font-heading text-2xl text-text font-normal mt-0.5">
              Target Career Role Benchmarks
            </h3>
            <p className="text-xs text-text-muted font-body mt-0.5">
              Select up to 3 target roles to calibrate competency benchmarks and interview prep.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingRoles(!isEditingRoles)}
            className="font-mono text-xs"
          >
            {isEditingRoles ? "Cancel Edit" : "Edit Target Roles"}
          </Button>
        </div>

        {/* Edit Roles Selector */}
        {isEditingRoles && (
          <div className="p-4 bg-paper-sunken border border-border space-y-3">
            <span className="font-mono text-xs uppercase font-bold text-text block">
              Select Up To 3 Priority Roles
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                "Product Manager",
                "Management Consultant",
                "Brand Manager",
                "Business Analyst",
              ].map((role) => {
                const isSelected = roleChoices.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (roleChoices.length > 1) {
                          setRoleChoices(roleChoices.filter((r) => r !== role));
                        }
                      } else {
                        if (roleChoices.length < 3) {
                          setRoleChoices([...roleChoices, role]);
                        }
                      }
                    }}
                    className={`p-2.5 border text-xs font-mono text-left transition-colors ${
                      isSelected
                        ? "border-leaf bg-leaf/10 text-text font-bold"
                        : "border-border bg-paper text-text-muted hover:bg-paper-sunken"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {role}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={savingRoles}
                onClick={handleSaveRoles}
                className="font-mono text-xs"
              >
                {savingRoles ? "Saving..." : "Save Target Roles"}
              </Button>
            </div>
          </div>
        )}

        {/* Role Tab Navigation */}
        <div className="flex border-b border-border font-mono text-xs">
          {targetRoles.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoleIndex(idx)}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                selectedRoleIndex === idx
                  ? "border-leaf text-text font-bold bg-paper-sunken"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {r.roleName}
            </button>
          ))}
        </div>

        {/* Selected Role Gap Details */}
        {activeGap && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-text-muted">
                {activeGap.gapSummary}
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-text-muted uppercase">
                  Profile Match
                </span>
                <div className="font-mono text-xl font-bold text-leaf">
                  {activeGap.overallMatchScore.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Gap Bars Table */}
            <div className="divide-y divide-border border border-border bg-paper">
              {activeGap.weakestSkills.map((item) => {
                const hasDeficit = item.gap > 0;
                return (
                  <div key={item.name} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="w-48">
                      <span className="font-bold text-text">{item.name}</span>
                      <span className="text-[10px] text-text-muted block">
                        Target Benchmark: {item.benchmark.toFixed(1)}
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="flex-1 bg-paper-sunken border border-border h-3 relative">
                      <div
                        className={`h-full ${hasDeficit ? "bg-terracotta/70" : "bg-leaf/80"}`}
                        style={{ width: `${Math.min(100, item.current)}%` }}
                      />
                      {/* Benchmark Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-text z-10"
                        style={{ left: `${item.benchmark}%` }}
                      />
                    </div>

                    <div className="w-28 text-right shrink-0">
                      <span className="font-bold text-text">{item.current.toFixed(1)}</span>
                      <span
                        className={`text-[10px] block ${
                          hasDeficit ? "text-terracotta" : "text-leaf font-bold"
                        }`}
                      >
                        {hasDeficit ? `-${item.gap.toFixed(1)} Deficit` : "✓ Benchmark Met"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
