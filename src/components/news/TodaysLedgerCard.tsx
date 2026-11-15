"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Newspaper,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  HelpCircle,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Leaf,
} from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  pubDate: string;
  subjectCode: string;
  topicName: string;
  whyItMatters: string;
  gdQuestion: string;
  interviewQuestion: string;
  isSaved?: boolean;
}

export function TodaysLedgerCard() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string>("Updated recently");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessMap, setSavedSuccessMap] = useState<Record<string, boolean>>({});

  const fetchTopNews = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/news?limit=5");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.updatedLabel) {
          setUpdatedLabel(data.updatedLabel);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch Today's Ledger news:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopNews();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/news", { method: "POST" });
      await fetchTopNews(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveAsCard = async (newsItem: NewsItem) => {
    setSavingId(newsItem.id);
    try {
      const res = await fetch("/api/news/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsItemId: newsItem.id, createCard: true }),
      });
      if (res.ok) {
        setSavedSuccessMap((prev) => ({ ...prev, [newsItem.id]: true }));
        setItems((prev) =>
          prev.map((it) => (it.id === newsItem.id ? { ...it, isSaved: true } : it))
        );
      }
    } catch (err) {
      console.error("Save as card failed:", err);
    } finally {
      setSavingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-surface rounded-lg border border-text/10 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-text/10 bg-bg/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-sindoor/10 text-sindoor flex items-center justify-center shrink-0">
            <Newspaper size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading text-lg font-medium text-text">
                Today&apos;s News
              </h2>
              <span className="text-[11px] font-body font-medium px-2 py-0.5 rounded bg-turmeric/15 text-turmeric-dark">
                Current affairs
              </span>
            </div>
            <p className="text-xs font-body text-text-muted mt-0.5">
              The Hindu Business RSS • {updatedLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg border border-border/40 transition-colors"
            title="Refresh news feeds"
            aria-label="Refresh news feeds"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin text-sindoor" : ""} />
          </button>
          <Link
            href="/news"
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-surface border border-border text-xs font-body font-medium text-text hover:text-sindoor hover:border-sindoor/40 transition-colors shadow-2xs"
          >
            <span>All News</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-text/10">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin text-sindoor mb-2">
              <RefreshCw size={20} />
            </div>
            <p className="text-xs font-body text-text-muted">Loading today&apos;s headlines &amp; MBA tags...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Newspaper size={32} className="text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm font-heading font-medium text-text">No articles cached yet</p>
            <p className="text-xs font-body text-text-muted mt-1">
              Click refresh above to fetch the latest feeds from The Hindu.
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isSaved = item.isSaved || savedSuccessMap[item.id];
            const isSaving = savingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 hover:bg-bg/40 transition-colors duration-150"
              >
                {/* Meta row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {item.subjectCode || "BUSINESS"}
                    </span>
                    <span className="text-xs text-text-muted font-body">
                      • {item.topicName}
                    </span>
                  </div>
                  <span className="text-[11px] font-body text-text-muted">
                    {item.source}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="font-heading text-base sm:text-lg font-normal text-text leading-snug">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-sindoor transition-colors inline-flex items-baseline space-x-1 group"
                  >
                    <span>{item.title}</span>
                    <ExternalLink
                      size={13}
                      className="inline-block opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-sindoor shrink-0"
                    />
                  </a>
                </h3>

                {/* RSS Summary (Concise) */}
                <p className="text-xs sm:text-sm font-body text-text-muted mt-2 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>

                {/* MBA Relevance & AI Insights */}
                <div className="mt-3 p-3 rounded bg-bg/80 border border-border/60">
                  <div className="flex items-start space-x-2">
                    <Sparkles size={15} className="text-turmeric shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-body font-semibold text-text text-xs block mb-0.5">
                        Why it matters for your studies
                      </span>
                      <p className="font-body text-text/90 leading-relaxed">
                        {item.whyItMatters}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Interview & GD questions */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                      <div className="p-2.5 rounded bg-surface/70 border border-border/40">
                        <div className="flex items-center space-x-1.5 text-leaf font-body text-xs font-semibold mb-1">
                          <MessageSquare size={12} />
                          <span>Group discussion prompt</span>
                        </div>
                        <p className="text-xs font-body text-text leading-relaxed">
                          {item.gdQuestion}
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-surface/70 border border-border/40">
                        <div className="flex items-center space-x-1.5 text-primary font-body text-xs font-semibold mb-1">
                          <HelpCircle size={12} />
                          <span>Interview perspective</span>
                        </div>
                        <p className="text-xs font-body text-text leading-relaxed">
                          {item.interviewQuestion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSaveAsCard(item)}
                      disabled={isSaving}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-body font-medium transition-all ${
                        isSaved
                          ? "bg-leaf/10 text-leaf border border-leaf/30 font-medium"
                          : "bg-surface border border-border text-text hover:border-sindoor/40 hover:text-sindoor"
                      }`}
                      title="Save as active recall review card"
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck size={13} />
                          <span>Saved as card</span>
                        </>
                      ) : (
                        <>
                          <Bookmark size={13} />
                          <span>{isSaving ? "Saving..." : "Save as card"}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="inline-flex items-center space-x-1 text-xs font-body text-text-muted hover:text-text px-2 py-1 rounded hover:bg-bg transition-colors"
                    >
                      <span>{isExpanded ? "Hide prompts" : "Discussion & interview prompts"}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Credit source and external link */}
                  <div className="flex items-center space-x-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-body text-sindoor hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Read source</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-bg/40 flex items-center justify-between text-xs font-body text-text-muted">
        <span className="flex items-center space-x-1.5">
          <Leaf size={14} className="text-leaf" />
          <span>Updates automatically throughout the day</span>
        </span>
        <Link href="/news" className="text-sindoor hover:underline font-medium">
          View all {items.length > 0 ? "articles →" : "→"}
        </Link>
      </div>
    </div>
  );
}
