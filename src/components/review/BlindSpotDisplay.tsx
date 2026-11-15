"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ChevronDown, ChevronUp, Eye, Compass } from "lucide-react";
import { BlindSpotItem, CalibrationLabel } from "@/lib/review/blindSpotService";

interface BlindSpotDisplayProps {
  initialItems?: BlindSpotItem[];
  onStartFix?: (cardIds: string[]) => void;
  title?: string;
}

export function BlindSpotDisplay({
  initialItems,
  onStartFix,
  title = "How your confidence compares with your answers",
}: BlindSpotDisplayProps) {
  const [items, setItems] = useState<BlindSpotItem[]>(initialItems || []);
  const [loading, setLoading] = useState(!initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialItems) {
      fetch("/api/review/blind-spots")
        .then((res) => res.json())
        .then((data) => {
          if (data.blindSpots && Array.isArray(data.blindSpots)) {
            setItems(data.blindSpots);
          }
        })
        .catch((err) => console.error("Error loading blind spots:", err))
        .finally(() => setLoading(false));
    }
  }, [initialItems]);

  if (loading || items.length === 0) {
    return null;
  }

  const getLabelStyle = (label: CalibrationLabel) => {
    switch (label) {
      case "You know more than you think":
        return {
          badge: "bg-leaf/10 text-leaf border-leaf/30",
          cardBg: "bg-surface border-leaf/30",
          desc: "You answered these questions accurately despite feeling unsure. Trust your instincts!",
        };
      case "Spot on":
        return {
          badge: "bg-cobalt/10 text-cobalt border-cobalt/30",
          cardBg: "bg-surface border-cobalt/30",
          desc: "Your self-check closely matches how you performed in your practice drills.",
        };
      case "Worth another look":
        return {
          badge: "bg-turmeric/10 text-turmeric border-turmeric/30",
          cardBg: "bg-surface border-turmeric/30",
          desc: "A quick refresher here will help reinforce the core concepts before class.",
        };
    }
  };

  return (
    <div className="space-y-3 font-body">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-leaf">
            Self-check insights
          </span>
          <h3 className="font-heading text-base text-text font-normal">
            {title}
          </h3>
        </div>
        <span className="text-[11px] text-text-muted">
          Based on recent practice
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.slice(0, 2).map((item) => {
          const style = getLabelStyle(item.label);
          const isExpanded = expandedId === item.conceptId;

          return (
            <div
              key={item.conceptId}
              className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${style.cardBg}`}
            >
              <div className="space-y-2">
                {/* Subject & Label */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-text-muted truncate">
                    {item.subjectCode} · {item.subjectName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${style.badge}`}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Concept Title */}
                <h4 className="font-heading text-sm text-text font-normal leading-snug">
                  {item.conceptName}
                </h4>

                {/* Warm Description */}
                <p className="text-xs text-text-muted leading-relaxed">
                  {style.desc}
                </p>

                {/* Trend Change if available */}
                {item.trendChange && (
                  <div className="text-[11px] text-cobalt font-medium flex items-center gap-1 pt-0.5">
                    <span>📈</span>
                    <span>{item.trendChange}</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions: 3-minute fix button & toggle details */}
              <div className="pt-3 mt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                {/* 3-Minute Fix Button */}
                {onStartFix ? (
                  <button
                    type="button"
                    onClick={() => onStartFix(item.targetedCardIds)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cobalt text-white text-xs font-medium hover:bg-cobalt/90 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    <Sparkles size={12} />
                    <span>3-minute fix</span>
                  </button>
                ) : (
                  <Link
                    href={`/review?conceptId=${item.conceptId}&mode=targeted`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cobalt text-white text-xs font-medium hover:bg-cobalt/90 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    <Sparkles size={12} />
                    <span>3-minute fix</span>
                  </Link>
                )}

                {/* Small Detail View Toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.conceptId)}
                  className="text-[11px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
                >
                  <span>{isExpanded ? "Hide details" : "View details"}</span>
                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>

              {/* Exact Numbers Detail (only on tap) */}
              {isExpanded && (
                <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-text-muted space-y-1 bg-surface/40 p-2 rounded">
                  <div className="flex justify-between">
                    <span>Recent answers evaluated:</span>
                    <span className="font-mono text-text">{item.detailNumbers.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days practiced:</span>
                    <span className="font-mono text-text">{item.detailNumbers.daysCount} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Answer accuracy:</span>
                    <span className="font-mono text-text">
                      {item.detailNumbers.correct} / {item.detailNumbers.total} ({item.detailNumbers.accuracyPercent}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
