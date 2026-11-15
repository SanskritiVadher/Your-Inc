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
  Share2,
  Check,
  Briefcase,
  Award,
  Layers,
  ShieldCheck,
  TrendingUp,
  FileText,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CandidateData {
  name: string;
  companyName: string;
  program: string;
  specialization: string;
  currentTerm: string;
  creditRating: string;
  quarterlyCount: number;
}

interface SkillData {
  name: string;
  category: string;
  proficiency: number;
}

interface ProjectData {
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
}

interface IpoSubject {
  id: string;
  code: string;
  name: string;
  sharePrice: number;
}

interface ProofSettings {
  showSkills?: boolean;
  showTrends?: boolean;
  showProjects?: boolean;
  showIpoSubjects?: boolean;
  showQuarterlyConsistency?: boolean;
}

interface PublicProofClientProps {
  candidate: CandidateData;
  skills: SkillData[];
  projects: ProjectData[];
  ipoSubjects: IpoSubject[];
  settings: ProofSettings;
  username: string;
}

export function PublicProofClient({
  candidate,
  skills,
  projects,
  ipoSubjects,
  settings,
  username,
}: PublicProofClientProps) {
  const [copied, setCopied] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const radarData = skills.map((s) => ({
    skill: s.name,
    score: s.proficiency,
    fullMark: 100,
  }));

  return (
    <div className="min-h-screen bg-paper text-text font-body py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Disclaimer Banner */}
        <div className="p-3 bg-paper-sunken border border-border flex items-start gap-2.5 text-xs text-text-muted">
          <Info size={15} className="text-leaf shrink-0 mt-0.5" />
          <div className="font-mono text-[11px] leading-relaxed">
            <strong className="text-text uppercase tracking-wider">Verified Skill Record:</strong>{" "}
            Self-tracked learning record powered by You Inc. Proficiency scores are derived exclusively
            from concept recall accuracy, regular review, and blind mock interview
            practice. Never self-rated. Not an institutional degree transcript or university certification.
          </div>
        </div>

        {/* Candidate Header / Card */}
        <div className="border border-border bg-paper p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-body text-xs font-semibold text-leaf">
                  Verified Candidate Profile
                </span>
                <span className="font-body text-xs text-text-muted">@{username}</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal mt-1">
                {candidate.name}
              </h1>
              <p className="font-mono text-sm text-text-muted mt-0.5">
                {candidate.program} &bull; {candidate.specialization}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono">
                <span className="px-2 py-0.5 bg-paper-sunken border border-border text-text">
                  {candidate.currentTerm}
                </span>
                <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-bold">
                  Academic Rating: {candidate.creditRating}
                </span>
                <span className="px-2 py-0.5 bg-paper-sunken border border-border text-text-muted">
                  {candidate.quarterlyCount} Quarterly Audits Completed
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 font-mono text-xs w-full sm:w-auto"
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? "Link Copied!" : "Copy Proof Link"}
              </Button>
              <button
                onClick={() => setShowLinkedInModal(true)}
                className="font-mono text-xs text-leaf hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <ExternalLink size={12} /> Add to LinkedIn Featured
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: VERIFIED SKILLS RADAR & TABLE */}
        {settings.showSkills && skills.length > 0 && (
          <div className="border border-border bg-paper p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                  Competency Map
                </span>
                <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
                  Verified MBA Skill Profile
                </h2>
                <p className="text-xs text-text-muted font-body mt-0.5">
                  Evaluated across theoretical concept retention (70%) and applied mock case evaluations (30%).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Radar Chart */}
              <div className="h-64 sm:h-72 w-full flex items-center justify-center">
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
                      stroke="#3F7D4E"
                      fill="#3F7D4E"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Skills Score Breakdown */}
              <div className="space-y-2 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-text-muted block mb-2">
                  Audited Scores (0–100)
                </span>
                <div className="divide-y divide-border border border-border bg-paper-sunken">
                  {skills.slice(0, 8).map((s) => (
                    <div key={s.name} className="p-2 flex items-center justify-between">
                      <span className="text-text">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-border h-1.5 hidden sm:block">
                          <div
                            className="bg-leaf h-1.5"
                            style={{ width: `${Math.min(100, s.proficiency)}%` }}
                          />
                        </div>
                        <span className="font-bold text-text w-10 text-right">
                          {s.proficiency.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: APPROVED PROJECT VAULT */}
        {settings.showProjects && projects.length > 0 && (
          <div className="border border-border bg-paper p-6 space-y-6">
            <div className="border-b border-border pb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Portfolio Vault
              </span>
              <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
                Verified Projects & Case Deliverables
              </h2>
              <p className="text-xs text-text-muted font-body mt-0.5">
                Each project is audited for authentic deliverables with strict prohibition of hallucinated numbers.
              </p>
            </div>

            <div className="space-y-4">
              {projects.map((proj) => {
                const isExpanded = expandedProject === proj.id;
                const star = proj.starStory as {
                  situation?: string;
                  task?: string;
                  action?: string;
                  result?: string;
                } | null;

                return (
                  <div key={proj.id} className="border border-border bg-paper p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-paper-sunken border border-border font-mono text-[10px] uppercase text-text font-semibold">
                            {proj.role || "Lead Contributor"}
                          </span>
                          {proj.metric && (
                            <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 font-mono text-[10px] text-leaf font-bold">
                              Verified Metric: {proj.metric}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading text-lg font-medium text-text mt-1">
                          {proj.title}
                        </h3>
                      </div>

                      <button
                        onClick={() => setExpandedProject(isExpanded ? null : proj.id)}
                        className="font-mono text-xs text-leaf hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? "Collapse" : "View STAR Story"}
                        <ChevronRight
                          size={13}
                          className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>
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

                    {/* Expanded STAR Story */}
                    {isExpanded && star && (
                      <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
                        <div className="p-2.5 bg-paper border border-border">
                          <strong className="font-mono text-[10px] text-text-muted uppercase block mb-0.5">
                            Situation
                          </strong>
                          <p className="text-text">{star.situation}</p>
                        </div>
                        <div className="p-2.5 bg-paper border border-border">
                          <strong className="font-mono text-[10px] text-text-muted uppercase block mb-0.5">
                            Task
                          </strong>
                          <p className="text-text">{star.task}</p>
                        </div>
                        <div className="p-2.5 bg-paper border border-border">
                          <strong className="font-mono text-[10px] text-text-muted uppercase block mb-0.5">
                            Action
                          </strong>
                          <p className="text-text">{star.action}</p>
                        </div>
                        <div className="p-2.5 bg-paper border border-border">
                          <strong className="font-mono text-[10px] text-text-muted uppercase block mb-0.5">
                            Result
                          </strong>
                          <p className="text-text font-medium">{star.result}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: IPO'D DEPARTMENTS / SUBJECTS */}
        {settings.showIpoSubjects && ipoSubjects.length > 0 && (
          <div className="border border-border bg-paper p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Milestone Achievements
              </span>
              <h2 className="font-heading text-2xl text-text font-normal mt-0.5">
                IPO&apos;d Academic Departments
              </h2>
              <p className="text-xs text-text-muted font-body mt-0.5">
                Departments where concept retention and assignment outcomes reached the ₹100.00 IPO threshold.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ipoSubjects.map((sub) => (
                <div key={sub.id} className="p-3 bg-paper-sunken border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-text">{sub.code}</span>
                    <span className="px-1.5 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] font-bold">
                      IPO ₹{sub.sharePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs font-body text-text mt-1 truncate">{sub.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center font-mono text-xs text-text-muted py-6 border-t border-border">
          Powered by You Inc. &bull; The Portfolio of Your Degree &bull; Authenticity Guaranteed
        </div>
      </div>

      {/* Modal: LinkedIn Featured Instructions */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-lg p-6 space-y-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Career Proof Integration
              </span>
              <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                Add to LinkedIn Profile
              </h3>
              <p className="text-xs text-text-muted font-body mt-1">
                Showcase your self-tracked You Inc. competency proof directly in your LinkedIn &quot;Featured&quot; section.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs text-text bg-paper-sunken p-4 border border-border">
              <div className="flex items-start gap-2">
                <span className="font-bold text-leaf">1.</span>
                <span>Copy your public proof link: <code className="bg-paper px-1 border border-border">{window.location.href}</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-leaf">2.</span>
                <span>Go to your LinkedIn profile and click <strong>Add profile section &rarr; Recommended &rarr; Add featured</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-leaf">3.</span>
                <span>Select <strong>Add a link (+)</strong> and paste the copied URL.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-leaf">4.</span>
                <span>Title: <code>Verified MBA Competency Portfolio | You Inc.</code></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkedInModal(false)}
                className="font-mono text-xs"
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                className="font-mono text-xs flex items-center gap-1.5"
              >
                {copied ? <Check size={13} /> : <Share2 size={13} />}
                {copied ? "Copied!" : "Copy URL"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
