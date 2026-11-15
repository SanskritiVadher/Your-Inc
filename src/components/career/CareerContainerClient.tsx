"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Radar,
  Target,
  Briefcase,
  Award,
  Globe,
  Layers,
  Sparkles,
} from "lucide-react";
import { SkillMapView, SkillItem, SkillSuggestion } from "./SkillMapView";
import { TargetRolesView } from "./TargetRolesView";
import { InterviewRoomView } from "./InterviewRoomView";
import { ProjectVaultView, ProjectVaultItem } from "./ProjectVaultView";
import { PublicProofConfigView } from "./PublicProofConfigView";

type CareerTab = "skills" | "roles" | "interviews" | "vault" | "proof";

export function CareerContainerClient() {
  const [activeTab, setActiveTab] = useState<CareerTab>("skills");

  // State data
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [targetRoles, setTargetRoles] = useState<any[]>([]);
  const [gapsPerRole, setGapsPerRole] = useState<any[]>([]);
  const [placementStartDate, setPlacementStartDate] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectVaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [skillsRes, rolesRes, projectsRes] = await Promise.all([
        fetch("/api/career/skills"),
        fetch("/api/career/roles"),
        fetch("/api/career/projects"),
      ]);

      if (skillsRes.ok) {
        const sJson = await skillsRes.json();
        setSkills(sJson.skills || []);
        setSuggestions(sJson.suggestions || []);
      }

      if (rolesRes.ok) {
        const rJson = await rolesRes.json();
        setTargetRoles(rJson.targetRoles || []);
        setGapsPerRole(rJson.gapsPerRole || []);
        setPlacementStartDate(rJson.placementStartDate || null);
        setCountdown(rJson.countdown || null);
      }

      if (projectsRes.ok) {
        const pJson = await projectsRes.json();
        setProjects(pJson.projects || []);
      }
    } catch (e) {
      console.error("Failed to load career data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "interview" || tabParam === "interviews") {
        setActiveTab("interviews");
      } else if (tabParam && ["skills", "roles", "vault", "proof"].includes(tabParam)) {
        setActiveTab(tabParam as CareerTab);
      }
    }
  }, [fetchAllData]);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex border-b border-border font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "skills"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Layers size={14} className={activeTab === "skills" ? "text-leaf" : ""} />
          Competency Radar ({skills.length})
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "roles"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Target size={14} className={activeTab === "roles" ? "text-leaf" : ""} />
          Target Roles & Countdown
        </button>

        <button
          onClick={() => setActiveTab("interviews")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "interviews"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Award size={14} className={activeTab === "interviews" ? "text-leaf" : ""} />
          Interview Room
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "vault"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Briefcase size={14} className={activeTab === "vault" ? "text-leaf" : ""} />
          Project Vault ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab("proof")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "proof"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Globe size={14} className={activeTab === "proof" ? "text-leaf" : ""} />
          Public Proof Page (/u/)
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-text-muted">
          Loading career competencies & placement intelligence...
        </div>
      ) : (
        <div>
          {activeTab === "skills" && (
            <SkillMapView
              skills={skills}
              suggestions={suggestions}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "roles" && countdown && (
            <TargetRolesView
              targetRoles={targetRoles}
              gapsPerRole={gapsPerRole}
              placementStartDate={placementStartDate}
              countdown={countdown}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "interviews" && (
            <InterviewRoomView onScorecardCompleted={fetchAllData} />
          )}

          {activeTab === "vault" && (
            <ProjectVaultView projects={projects} onRefresh={fetchAllData} />
          )}

          {activeTab === "proof" && <PublicProofConfigView />}
        </div>
      )}
    </div>
  );
}
