"use client";

import React, { useEffect, useState } from "react";
import { Check, X, Link2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ConceptInfo {
  id: string;
  name: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface ConceptLinkItem {
  id: string;
  fromConcept: ConceptInfo;
  toConcept: ConceptInfo;
  reason: string;
  confirmed: boolean;
}

interface SuggestedLink {
  fromConcept: ConceptInfo;
  toConcept: ConceptInfo;
  similarity: number;
  reason: string;
}

export const CrossSubjectLinks: React.FC<{ currentSubjectId?: string }> = ({ currentSubjectId }) => {
  const { success, error: toastError } = useToast();
  const [links, setLinks] = useState<ConceptLinkItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedLink[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLinks = async () => {
    try {
      const res = await fetch("/api/concept-links");
      const data = await res.json();
      if (res.ok) {
        setLinks(data.links || []);
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleApproveSuggestion = async (sug: SuggestedLink) => {
    try {
      const res = await fetch("/api/concept-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromConceptId: sug.fromConcept.id,
          toConceptId: sug.toConcept.id,
          reason: sug.reason,
          confirmed: true,
        }),
      });
      if (res.ok) {
        success("Concept Link Confirmed", `Connected "${sug.fromConcept.name}" ↔ "${sug.toConcept.name}"`);
        setSuggestions((prev) => prev.filter((s) => s !== sug));
        loadLinks();
      }
    } catch (e) {
      toastError("Failed to confirm link");
    }
  };

  const handleDismissSuggestion = (sug: SuggestedLink) => {
    setSuggestions((prev) => prev.filter((s) => s !== sug));
  };

  return (
    <div className="rounded-[3px] border border-border bg-surface p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center space-x-2.5">
          <Sparkles size={20} className="text-turmeric" />
          <div>
            <h3 className="font-heading text-lg text-text">
              Cross-Subject Concept Links
            </h3>
            <p className="text-xs text-text-muted font-body">
              Connections between concepts across your courses.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-suggested links */}
      {suggestions.length > 0 && (
        <div className="space-y-3 font-body">
          <div className="flex items-center space-x-1.5 text-xs text-turmeric font-medium">
            <Sparkles size={14} />
            <span>Suggested cross-subject links ({suggestions.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug, i) => (
              <div
                key={i}
                className="p-3.5 rounded border border-border/80 bg-surface flex flex-col justify-between space-y-2.5 font-body"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text">
                    {sug.fromConcept.name}
                    <span className="text-[11px] text-text-muted ml-1">({sug.fromConcept.subject.code})</span>
                  </span>
                  <Link2 size={13} className="text-turmeric shrink-0 mx-2" />
                  <span className="font-medium text-text">
                    {sug.toConcept.name}
                    <span className="text-[11px] text-text-muted ml-1">({sug.toConcept.subject.code})</span>
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed font-body">
                  {sug.reason}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-[11px] text-text-muted">
                    {Math.round(sug.similarity * 100)}% match
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleDismissSuggestion(sug)}
                      className="p-1 rounded text-text-muted hover:text-sindoor"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveSuggestion(sug)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-cobalt text-white dark:text-[#141B2D] text-xs font-medium hover:bg-cobalt/90"
                    >
                      <Check size={12} />
                      <span>Confirm link</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed links */}
      <div className="space-y-3 font-body">
        <h4 className="text-xs font-medium text-text-muted">
          Confirmed cross-subject links ({links.length})
        </h4>

        {links.length === 0 ? (
          <p className="text-xs text-text-muted py-3 text-center border border-dashed border-border/70 rounded">
            No confirmed cross-subject links yet. Link concepts across subjects to build your connected study notes.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {links.map((link) => (
              <div key={link.id} className="py-2.5 flex items-start justify-between gap-4 font-body">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-medium text-text">{link.fromConcept?.name}</span>
                    <span className="text-[10px] text-text-muted">[{link.fromConcept?.subject?.code}]</span>
                    <span className="text-border">↔</span>
                    <span className="font-medium text-text">{link.toConcept?.name}</span>
                    <span className="text-[10px] text-text-muted">[{link.toConcept?.subject?.code}]</span>
                  </div>
                  <p className="text-xs text-text-muted">{link.reason}</p>
                </div>
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-leaf/10 text-leaf border border-leaf/30 font-medium">
                  Confirmed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrossSubjectLinks;
