"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Building2,
  BookOpen,
  Send,
  Award,
  History,
  CheckCircle2,
  Sparkles,
  MapPin,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface NearbyBusiness {
  name: string;
  category: string;
  distanceMeters: number;
}

interface ActiveFieldCase {
  id: string;
  areaName: string;
  lat: number;
  lng: number;
  casePrompt: string;
  businessContext?: NearbyBusiness[];
  concept?: {
    id: string;
    name: string;
    subject: { code: string; name: string };
  } | null;
}

interface JournalEntry {
  id: string;
  areaName: string;
  casePrompt: string;
  studentAnswer: string | null;
  score: number | null;
  feedback: string | null;
  reinvestmentGain: number | null;
  completedAt: string | null;
  concept?: {
    id: string;
    name: string;
    subject: { code: string; name: string };
  } | null;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  reinvestmentGain: number;
  newConceptValue: number;
}

export function FieldCasesView() {
  const [activeCase, setActiveCase] = useState<ActiveFieldCase | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS coords for real Overpass radar
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [generating, setGenerating] = useState(false);

  // Student answer form
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Active view tab: "solver" | "journal"
  const [tab, setTab] = useState<"solver" | "journal">("solver");

  const fetchCasesData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/location/field-cases");
      if (!res.ok) throw new Error("Failed to load field cases");
      const data = await res.json();
      setActiveCase(data.activeCase || null);
      setJournal(data.fieldJournal || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCasesData();
  }, [fetchCasesData]);

  // Acquire live coarse GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fallback to campus coordinate
          setCoords({ lat: 28.545, lng: 77.192 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleGenerateCase = async () => {
    try {
      setGenerating(true);
      setEvaluation(null);
      setAnswer("");
      const targetLat = coords?.lat ?? 28.545;
      const targetLng = coords?.lng ?? 77.192;

      const res = await fetch("/api/location/field-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          lat: targetLat,
          lng: targetLng,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate field case");
      }

      const data = await res.json();
      setActiveCase({
        id: data.fieldCase.id,
        areaName: data.fieldCase.areaName,
        lat: targetLat,
        lng: targetLng,
        casePrompt: data.fieldCase.casePrompt,
        businessContext: data.fieldCase.nearbyBusinesses,
        concept: {
          id: "weakest",
          name: data.fieldCase.conceptName,
          subject: { code: data.fieldCase.subjectCode, name: "Department" },
        },
      });
      setTab("solver");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error generating case");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !answer.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/location/field-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          fieldCaseId: activeCase.id,
          studentAnswer: answer,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grade field case");
      }

      const evalData: EvaluationResult = await res.json();
      setEvaluation(evalData);
      await fetchCasesData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error grading answer");
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Grounded Learning
            </span>
            <span className="font-body text-xs text-text-muted">OpenStreetMap Field Cases</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Real-World Micro-Cases
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            5-minute executive case challenges generated using authentic OpenStreetMap business points
            around your current coordinates. Grounded in actual physical realities, not simulated financials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex border border-border">
            <button
              onClick={() => setTab("solver")}
              className={`px-3 py-1.5 font-mono text-xs transition-colors flex items-center gap-1.5 ${
                tab === "solver"
                  ? "bg-leaf text-white font-bold"
                  : "bg-paper text-text hover:bg-paper-sunken"
              }`}
            >
              <BookOpen size={13} />
              Active Case
            </button>
            <button
              onClick={() => setTab("journal")}
              className={`px-3 py-1.5 font-mono text-xs transition-colors flex items-center gap-1.5 border-l border-border ${
                tab === "journal"
                  ? "bg-leaf text-white font-bold"
                  : "bg-paper text-text hover:bg-paper-sunken"
              }`}
            >
              <History size={13} />
              Field Journal ({journal.length})
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateCase}
            disabled={generating}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            {generating ? "Scanning OSM..." : "Scan & Generate Case"}
          </Button>
        </div>
      </div>

      {/* GPS Context Pill */}
      <div className="flex items-center justify-between text-xs px-3 py-2 bg-paper-sunken border border-border">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-leaf" />
          <span className="font-mono text-text-muted">
            {coords
              ? `Nearby Radar: ~600m perimeter from ${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E`
              : "Locating surrounding commercial clusters..."}
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-muted">
          OSM Overpass API (24h Cache) &bull; Zero Fabricated Revenue
        </span>
      </div>

      {/* VIEW: SOLVER */}
      {tab === "solver" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-text-muted">
              Loading current field case...
            </div>
          ) : !activeCase ? (
            <div className="border border-dashed border-border p-10 text-center bg-paper-sunken">
              <Building2 size={36} className="mx-auto text-text-muted mb-3" />
              <h4 className="font-heading text-lg text-text">No Active Field Case</h4>
              <p className="text-xs text-text-muted font-body max-w-md mx-auto mt-1 mb-5">
                Scan your immediate campus or commercial surroundings. We query live OpenStreetMap nodes
                (shops, cafes, banks, clinics) and pair them with your most depreciated course concept
                for a 5-minute micro-analysis.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={handleGenerateCase}
                disabled={generating}
                className="font-mono text-xs"
              >
                <Sparkles size={14} className="mr-1.5" />
                {generating ? "Querying Overpass Nodes..." : "Generate Nearby Field Case"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Case Prompt & OSM Context (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Active Case Card */}
                <div className="border border-border bg-paper p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] uppercase font-bold">
                          {activeCase.concept?.subject.code || "CORE"} &bull; {activeCase.concept?.name || "Target Concept"}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          5-Min Executive Drill
                        </span>
                      </div>
                      <h3 className="font-heading text-xl text-text font-normal mt-2">
                        {activeCase.areaName}
                      </h3>
                    </div>
                  </div>

                  {/* OSM Real-World Radar Cards */}
                  {Array.isArray(activeCase.businessContext) && activeCase.businessContext.length > 0 && (
                    <div className="p-3 bg-paper-sunken border border-border space-y-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                        Verified OpenStreetMap Real Entities in Perimeter
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeCase.businessContext.map((b, idx) => (
                          <div
                            key={idx}
                            className="bg-paper p-2 border border-border text-xs font-mono flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-text truncate max-w-[160px]">{b.name}</div>
                              <div className="text-[10px] text-text-muted capitalize">{b.category}</div>
                            </div>
                            <span className="text-[11px] text-leaf shrink-0 font-semibold">
                              {b.distanceMeters}m away
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Case Prompt */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted font-semibold block">
                      Micro-Case Challenge
                    </span>
                    <p className="text-sm text-text font-body leading-relaxed whitespace-pre-line">
                      {activeCase.casePrompt}
                    </p>
                  </div>
                </div>

                {/* Submission Form or Evaluation Result */}
                {evaluation ? (
                  <div className="border border-leaf/40 bg-leaf/5 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 border border-leaf/30 bg-leaf/10 text-leaf shrink-0">
                        <Award size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] tracking-widest uppercase text-leaf font-bold">
                            FIELD EVALUATION COMPLETE
                          </span>
                          <span className="font-mono text-sm font-bold text-leaf">
                            Score: {evaluation.score.toFixed(1)}/100
                          </span>
                        </div>
                        <h4 className="font-heading text-lg font-medium text-text mt-0.5">
                          Ledger Reinvestment Credited
                        </h4>
                        <p className="text-xs text-text font-body mt-1 leading-relaxed">
                          {evaluation.feedback}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-leaf/20 font-mono text-xs">
                      <div className="bg-paper p-2.5 border border-border">
                        <span className="text-text-muted text-[10px]">Reinvestment Asset Gain</span>
                        <div className="text-leaf font-bold text-sm mt-0.5">
                          +₹{evaluation.reinvestmentGain.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-paper p-2.5 border border-border">
                        <span className="text-text-muted text-[10px]">New Concept Valuation</span>
                        <div className="text-text font-bold text-sm mt-0.5">
                          ₹{evaluation.newConceptValue.toFixed(1)}/100
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleGenerateCase}
                        className="font-mono text-xs"
                      >
                        Next Micro-Case
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitAnswer} className="border border-border bg-paper p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                        Your Executive Synthesis
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {wordCount} words {wordCount < 40 ? "(Min ~40 suggested)" : "✓ Good length"}
                      </span>
                    </div>

                    <textarea
                      required
                      rows={5}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Draft a concise executive take. E.g., 'Blue Tokai's physical footprint creates high switching costs for morning coffee commuters, yet they remain vulnerable to HDFC branch foot-traffic if...'"
                      className="w-full bg-paper border border-border p-3 font-body text-sm text-text focus:outline-none focus:border-leaf leading-relaxed"
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[11px] font-mono text-text-muted">
                        Graded on bottom-line clarity, spatial reasoning, and concept accuracy.
                      </span>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={submitting || !answer.trim()}
                        className="font-mono text-xs flex items-center gap-1.5"
                      >
                        <Send size={13} />
                        {submitting ? "Grading..." : "Submit Analysis"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Rubric Guidelines & Grounding Philosophy (1 col) */}
              <div className="space-y-4">
                <div className="border border-border bg-paper p-4 space-y-3">
                  <h4 className="font-heading text-base font-medium text-text flex items-center gap-2">
                    <FileText size={16} className="text-leaf" />
                    Grading Guidelines
                  </h4>
                  <ul className="space-y-2 text-xs font-body text-text-muted">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-leaf shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-text">Executive Bottom-Line:</strong> State your strategic conclusion in the first sentence.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-leaf shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-text">Concept Application:</strong> Apply the weak concept directly to the physical storefronts.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-leaf shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-text">Physical Grounding:</strong> Leverage real factors like distance, walking path, or storefront type.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="border border-border bg-paper-sunken p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-text">
                    <AlertCircle size={14} className="text-terracotta" />
                    <span>No Hallucinated Finances</span>
                  </div>
                  <p className="text-xs text-text-muted font-body leading-relaxed">
                    Field cases never invent fictional financial figures. Analyses focus strictly on visible
                    competitive advantages: footfall density, geographic lock-in, category adjacency, and branding moats.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: FIELD JOURNAL ARCHIVE */}
      {tab === "journal" && (
        <div className="space-y-4">
          {journal.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-center bg-paper-sunken font-mono text-xs text-text-muted">
              No completed field cases in your journal yet. Solve an active case to build your record.
            </div>
          ) : (
            <div className="space-y-4">
              {journal.map((item) => (
                <div key={item.id} className="border border-border bg-paper p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-leaf/10 border border-leaf/30 text-leaf font-mono text-[10px] uppercase font-bold">
                          {item.concept?.subject.code || "DEPT"} &bull; {item.concept?.name}
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h4 className="font-heading text-lg font-medium text-text mt-1">
                        {item.areaName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs text-leaf font-bold">
                        Score: {item.score?.toFixed(1)}/100
                      </span>
                      <div className="font-mono text-[11px] text-text-muted">
                        Reinvestment: +₹{item.reinvestmentGain?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-paper-sunken p-3 border border-border space-y-1">
                    <span className="font-mono text-[10px] uppercase text-text-muted font-bold block">
                      Case Prompt
                    </span>
                    <p className="text-xs text-text font-body line-clamp-2">
                      {item.casePrompt}
                    </p>
                  </div>

                  {item.studentAnswer && (
                    <div className="text-xs font-body text-text leading-relaxed">
                      <span className="font-mono text-[10px] uppercase text-text-muted font-bold block mb-1">
                        Your Submission
                      </span>
                      <p className="italic bg-paper p-2.5 border border-border">
                        &ldquo;{item.studentAnswer}&rdquo;
                      </p>
                    </div>
                  )}

                  {item.feedback && (
                    <div className="text-xs font-body text-text-muted border-t border-border pt-2 flex items-start gap-2">
                      <Award size={14} className="text-leaf shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-text font-mono text-[11px]">Evaluation:</strong> {item.feedback}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
