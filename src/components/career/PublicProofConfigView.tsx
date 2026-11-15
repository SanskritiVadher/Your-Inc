"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProofSettings {
  showSkills: boolean;
  showTrends: boolean;
  showProjects: boolean;
  showIpoSubjects: boolean;
  showQuarterlyConsistency: boolean;
}

export function PublicProofConfigView() {
  const [username, setUsername] = useState("");
  const [publicProofEnabled, setPublicProofEnabled] = useState(false);
  const [settings, setSettings] = useState<ProofSettings>({
    showSkills: true,
    showTrends: true,
    showProjects: true,
    showIpoSubjects: true,
    showQuarterlyConsistency: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/career/public-proof");
      if (res.ok) {
        const json = await res.json();
        setUsername(json.username || "");
        setPublicProofEnabled(Boolean(json.publicProofEnabled));
        if (json.proofSettings) {
          setSettings(json.proofSettings);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (enabledOverride?: boolean) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/career/public-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          publicProofEnabled:
            enabledOverride !== undefined ? enabledOverride : publicProofEnabled,
          proofSettings: settings,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update proof settings");
      }

      const json = await res.json();
      setUsername(json.username);
      setPublicProofEnabled(json.publicProofEnabled);
      setSettings(json.proofSettings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!username) return;
    const url = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Career Proof
            </span>
            <span className="font-body text-xs text-text-muted">Public Portfolio</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Public Proof URL & Visibility Controls
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Share your verified skill proficiencies, IPO&apos;d subjects, and project deliverables with recruiters.
            Strictly opt-in with fine-grained section toggles.
          </p>
        </div>

        {username && publicProofEnabled && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="font-mono text-xs flex items-center gap-1.5"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy URL"}
            </Button>
            <a
              href={`/u/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-leaf text-white font-mono text-xs hover:bg-leaf/90 transition-colors flex items-center gap-1.5"
            >
              <Eye size={13} /> View Live Proof
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta font-mono text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Master Toggle Banner */}
      <div className="border border-border bg-paper p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 border ${
              publicProofEnabled
                ? "bg-leaf/10 border-leaf/30 text-leaf"
                : "bg-paper-sunken border-border text-text-muted"
            }`}
          >
            {publicProofEnabled ? <Globe size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-text">
                Public Proof Access
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                  publicProofEnabled
                    ? "bg-leaf/10 text-leaf border border-leaf/30"
                    : "bg-paper-sunken text-text-muted border border-border"
                }`}
              >
                {publicProofEnabled ? "Live & Reachable" : "Private (Logged-out visitors blocked)"}
              </span>
            </div>
            <p className="text-xs text-text-muted font-body mt-0.5 max-w-xl">
              When enabled, your chosen sections are accessible at <code>/u/[username]</code> with
              LinkedIn OpenGraph preview meta. When disabled, the page displays a sovereign private notice.
            </p>
          </div>
        </div>

        <Button
          variant={publicProofEnabled ? "outline" : "primary"}
          size="sm"
          disabled={saving || (!username && !publicProofEnabled)}
          onClick={() => {
            const nextVal = !publicProofEnabled;
            setPublicProofEnabled(nextVal);
            handleSave(nextVal);
          }}
          className="font-mono text-xs"
        >
          {publicProofEnabled ? "Disable Public Proof" : "Enable Public Proof"}
        </Button>
      </div>

      {/* Username Slug Configuration */}
      <div className="border border-border bg-paper p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-heading text-lg font-medium text-text">
              Public Portfolio Link (Handle)
            </h4>
            <p className="font-mono text-xs text-text-muted mt-0.5">
              Unique public identifier for your career proof URL.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-muted">/u/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname or handle"
              className="bg-paper border border-border p-1.5 font-mono text-xs text-text focus:outline-none focus:border-leaf w-48"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={saving || !username}
              onClick={() => handleSave()}
              className="font-mono text-xs"
            >
              {saving ? "Saving..." : "Save Handle"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section-by-Section Visibility Toggles */}
      <div className="border border-border bg-paper p-5 space-y-4">
        <h4 className="font-heading text-lg font-medium text-text flex items-center gap-2">
          <Sliders size={16} className="text-leaf" />
          Section Visibility Controls
        </h4>
        <p className="text-xs text-text-muted font-body">
          Toggle what recruiters can see on your public portfolio.
        </p>

        <div className="divide-y divide-border border border-border bg-paper-sunken">
          {[
            {
              key: "showSkills",
              label: "10-Skill Radar Chart & Verified Scores",
              desc: "Displays the competency radar and live calculated scores (70% concepts + 30% mock practice).",
            },
            {
              key: "showProjects",
              label: "Approved Project Vault Portfolio",
              desc: "Displays approved project case deliverables, resume action bullets, and STAR frameworks.",
            },
            {
              key: "showIpoSubjects",
              label: "IPO'd Academic Departments",
              desc: "Displays subjects where mastery share price has crossed the ₹100.00 IPO threshold.",
            },
            {
              key: "showQuarterlyConsistency",
              label: "Credit Rating & Quarterly Consistency",
              desc: "Displays your credit rating (e.g. AAA to A) and completed quarterly report audits.",
            },
          ].map((item) => {
            const isChecked = settings[item.key as keyof ProofSettings];
            return (
              <div key={item.key} className="p-3 flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-text">{item.label}</span>
                  <p className="text-xs text-text-muted font-body mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const updated = { ...settings, [item.key]: e.target.checked };
                    setSettings(updated);
                  }}
                  className="mt-1 h-4 w-4 accent-leaf"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => handleSave()}
            className="font-mono text-xs"
          >
            {saving ? "Saving..." : "Save Visibility Settings"}
          </Button>
        </div>
      </div>

      {/* Confidentiality Guarantee Pill */}
      <div className="p-4 bg-paper-sunken border border-border flex items-start gap-3">
        <ShieldCheck size={18} className="text-leaf shrink-0 mt-0.5" />
        <div className="text-xs font-body text-text-muted leading-relaxed">
          <strong className="text-text font-mono text-[11px] uppercase">
            Guaranteed Private Data Isolation:
          </strong>{" "}
          Your personal memories, private notes, slide deck uploads, course syllabus files, individual
          letter grades, and location data are permanently excluded from the public proof
          API and HTML response. Only explicitly toggled competency records are rendered.
        </div>
      </div>
    </div>
  );
}
