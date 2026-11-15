"use client";

import React, { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import {
  Sparkles,
  Plus,
  Edit2,
  Check,
  X,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface SkillItem {
  id: string;
  name: string;
  category: string | null;
  proficiency: number;
  conceptCount: number;
  concepts: Array<{
    id: string;
    name: string;
    value: number;
    department: string;
    weight: number;
  }>;
}

export interface SkillSuggestion {
  conceptId: string;
  conceptName: string;
  subjectCode: string;
  skillId: string;
  skillName: string;
  rationale: string;
}

interface SkillMapViewProps {
  skills: SkillItem[];
  suggestions: SkillSuggestion[];
  onRefresh: () => void;
}

export function SkillMapView({ skills, suggestions, onRefresh }: SkillMapViewProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(skills[0] || null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCat, setNewSkillCat] = useState("General");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const radarData = skills.map((s) => ({
    skill: s.name,
    score: s.proficiency,
    fullMark: 100,
  }));

  const handleConfirmMapping = async (skillId: string, conceptId: string) => {
    try {
      const res = await fetch("/api/career/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_mapping",
          skillId,
          conceptId,
        }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/career/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_skill",
          name: newSkillName.trim(),
          category: newSkillCat.trim(),
        }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewSkillName("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRenameSkill = async (skillId: string) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch("/api/career/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_skill",
          skillId,
          newName: editingName.trim(),
        }),
      });
      if (res.ok) {
        setEditingSkillId(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Suggestion Banner if any mappings recommended */}
      {suggestions.length > 0 && (
        <div className="border border-leaf/40 bg-leaf/5 p-4 rounded-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 border border-leaf/30 bg-leaf/10 text-leaf shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase text-leaf font-bold">
                  AI COMPETENCY MAPPINGS READY ({suggestions.length} PENDING)
                </span>
                <p className="text-xs text-text font-body mt-0.5 leading-relaxed">
                  You Inc. identified concepts in your course departments that directly feed your career
                  skills. Confirm these mappings to calibrate your radar scores.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {suggestions.slice(0, 3).map((sug) => (
              <div
                key={`${sug.skillId}-${sug.conceptId}`}
                className="bg-paper p-3 border border-border text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span className="font-bold text-text">{sug.subjectCode}</span>
                    <span>&rarr; {sug.skillName}</span>
                  </div>
                  <div className="font-bold text-text mt-1 truncate">{sug.conceptName}</div>
                  <p className="text-[11px] text-text-muted font-body mt-0.5 line-clamp-2">
                    {sug.rationale}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleConfirmMapping(sug.skillId, sug.conceptId)}
                    className="font-mono text-[11px] py-0.5 px-2 flex items-center gap-1"
                  >
                    <Check size={12} /> Confirm Mapping
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Radar Chart + Skill Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recharts Radar & Skill Roster (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-border bg-paper p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                  Competency Radar
                </span>
                <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                  10 Core MBA Capabilities
                </h3>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="font-mono text-xs flex items-center gap-1"
              >
                <Plus size={13} /> Add Custom Skill
              </Button>
            </div>

            {/* Radar Chart */}
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#888" strokeOpacity={0.2} />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "#999", fontSize: 9, fontFamily: "monospace" }}
                  />
                  <Radar
                    name="Skill Proficiency"
                    dataKey="score"
                    stroke="#5B6B2E"
                    fill="#5B6B2E"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Selector Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border">
              {skills.map((s) => {
                const isSelected = selectedSkill?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSkill(s)}
                    className={`p-2 border text-left font-mono text-[11px] transition-colors ${
                      isSelected
                        ? "border-leaf bg-leaf/10 text-text font-bold"
                        : "border-border bg-paper hover:bg-paper-sunken text-text-muted"
                    }`}
                  >
                    <div className="truncate">{s.name}</div>
                    <div className="text-text font-bold mt-0.5">{s.proficiency.toFixed(1)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Skill Drilldown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedSkill ? (
            <div className="border border-border bg-paper p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-leaf font-bold">
                    {selectedSkill.category || "Competency"}
                  </span>

                  {editingSkillId === selectedSkill.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="p-1 font-mono text-xs border border-border bg-paper"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRenameSkill(selectedSkill.id)}
                      >
                        <Check size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSkillId(null)}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="font-heading text-xl text-text font-medium">
                        {selectedSkill.name}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingSkillId(selectedSkill.id);
                          setEditingName(selectedSkill.name);
                        }}
                        className="text-text-muted hover:text-text"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs text-text-muted">Calculated</span>
                  <div className="font-mono text-xl font-bold text-text">
                    {selectedSkill.proficiency.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Provenance breakdown: 70% Concept Mastery + 30% Interview Score */}
              <div className="p-3 bg-paper-sunken border border-border text-xs font-mono space-y-1.5">
                <span className="font-bold text-[10px] uppercase text-text-muted block">
                  Audited Formula Weighting
                </span>
                <div className="flex justify-between text-text">
                  <span>Concept Mastery (70%):</span>
                  <span className="font-bold">
                    {selectedSkill.concepts.length > 0
                      ? `${(
                          selectedSkill.concepts.reduce((sum, c) => sum + c.value, 0) /
                          selectedSkill.concepts.length
                        ).toFixed(1)}/100`
                      : "50.0/100 (Unmapped baseline)"}
                  </span>
                </div>
                <div className="flex justify-between text-text">
                  <span>Mock Interview Practice (30%):</span>
                  <span className="font-bold">Integrated</span>
                </div>
                <div className="text-[10px] text-text-muted pt-1 border-t border-border">
                  Never self-rated. Based on your review accuracy and practice evaluations.
                </div>
              </div>

              {/* Concepts backing this skill */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted uppercase text-[10px] font-bold">
                    Underlying Course Concepts ({selectedSkill.concepts.length})
                  </span>
                  <a
                    href="/review"
                    className="text-leaf hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <BookOpen size={11} /> Review Due Cards
                  </a>
                </div>

                {selectedSkill.concepts.length === 0 ? (
                  <div className="border border-dashed border-border p-4 text-center font-mono text-xs text-text-muted bg-paper-sunken">
                    No academic concepts mapped yet. Check the AI suggestions banner above or complete course decks.
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border bg-paper max-h-52 overflow-y-auto">
                    {selectedSkill.concepts.map((c) => (
                      <div key={c.id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="font-medium text-text truncate max-w-[200px]">{c.name}</div>
                          <span className="text-[10px] text-text-muted">{c.department} &bull; Weight: {c.weight.toFixed(1)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-text">₹{c.value.toFixed(1)}</span>
                          <span className="text-[10px] text-text-muted block">Asset Value</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border p-8 text-center text-xs font-mono text-text-muted">
              Select a skill to inspect its underlying concepts.
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Skill Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Custom Competency
              </span>
              <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                Add Career Vault Skill
              </h3>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Econometric Modeling, B2B SaaS Pricing"
                  className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newSkillCat}
                  onChange={(e) => setNewSkillCat(e.target.value)}
                  placeholder="e.g. Analytics, Strategy, Finance"
                  className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                />
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
                  disabled={saving}
                  className="font-mono text-xs"
                >
                  {saving ? "Adding..." : "Add Skill"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
