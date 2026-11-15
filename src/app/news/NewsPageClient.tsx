"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Newspaper,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Award,
  Settings,
  Plus,
  Trash2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Leaf,
} from "lucide-react";
import { PageHeaderBand } from "@/components/motifs";

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

interface NewsFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetchedAt: string | null;
  _count?: { items: number };
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizData {
  id: string;
  title: string;
  weekNumber: number;
  questions: QuizQuestion[];
  completed: boolean;
  score?: number;
}

export function NewsPageClient() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string>("Updated recently");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [onlySaved, setOnlySaved] = useState(false);

  // Expanded prompts state
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Saved state
  const [savingId, setSavingId] = useState<string | null>(null);

  // Feeds Modal State
  const [showFeedsModal, setShowFeedsModal] = useState(false);
  const [feeds, setFeeds] = useState<NewsFeed[]>([]);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedCategory, setNewFeedCategory] = useState("Business");
  const [feedError, setFeedError] = useState("");
  const [feedSuccess, setFeedSuccess] = useState("");

  // Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject !== "all") params.append("subjectCode", selectedSubject);
      if (selectedSource !== "all") params.append("source", selectedSource);
      if (onlySaved) params.append("onlySaved", "true");

      const res = await fetch(`/api/news?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.updatedLabel) setUpdatedLabel(data.updatedLabel);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedSubject, selectedSource, onlySaved]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/news", { method: "POST" });
      await fetchNews();
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
        setItems((prev) =>
          prev.map((it) => (it.id === newsItem.id ? { ...it, isSaved: true } : it))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Feed settings handlers
  const openFeedsModal = async () => {
    setShowFeedsModal(true);
    try {
      const res = await fetch("/api/news/feeds");
      if (res.ok) {
        const data = await res.json();
        setFeeds(data.feeds || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedError("");
    setFeedSuccess("");
    try {
      const res = await fetch("/api/news/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFeedName,
          url: newFeedUrl,
          category: newFeedCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedError(data.error || "Failed to add feed");
      } else {
        setFeedSuccess("Feed added successfully!");
        setNewFeedName("");
        setNewFeedUrl("");
        // Refresh feeds list
        const refreshed = await fetch("/api/news/feeds");
        if (refreshed.ok) {
          const rfData = await refreshed.json();
          setFeeds(rfData.feeds || []);
        }
      }
    } catch (err: any) {
      setFeedError(err.message || "Failed to add feed");
    }
  };

  const handleDeleteFeed = async (id: string) => {
    if (!confirm("Remove this RSS feed? Cached articles will remain in your archive.")) return;
    try {
      const res = await fetch(`/api/news/feeds?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setFeeds((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quiz handlers
  const openQuizModal = async () => {
    setShowQuizModal(true);
    setQuizLoading(true);
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizScore(null);
    try {
      const res = await fetch("/api/news/quiz");
      if (res.ok) {
        const data = await res.json();
        setQuizData(data.quiz);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizData) return;
    try {
      const res = await fetch("/api/news/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quizData.id,
          answers: quizAnswers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizScore(data.score);
        setQuizSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter items by client-side text search
  const filteredItems = items.filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.title.toLowerCase().includes(q) ||
      it.summary.toLowerCase().includes(q) ||
      it.topicName.toLowerCase().includes(q) ||
      it.subjectCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-bg text-text pb-16">
      {/* Top Navigation Bar */}
      <div className="border-b border-border/70 bg-surface/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-text-muted hover:text-sindoor transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <span className="text-border">/</span>
            <div className="flex items-center space-x-2">
              <Newspaper size={18} className="text-sindoor" />
              <h1 className="font-heading text-lg font-medium text-text">Today&apos;s News</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-surface border border-border text-xs font-mono text-text hover:text-sindoor transition-colors shadow-2xs"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin text-sindoor" : ""} />
              <span>{syncing ? "Updating..." : "Update Feeds"}</span>
            </button>

            <button
              onClick={openQuizModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-turmeric/20 text-turmeric-dark border border-turmeric/40 text-xs font-mono font-medium hover:bg-turmeric/30 transition-colors shadow-2xs"
            >
              <Award size={14} />
              <span>Weekly Quiz</span>
            </button>

            <button
              onClick={openFeedsModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-surface border border-border text-xs font-mono text-text hover:text-sindoor transition-colors shadow-2xs"
              title="Feed Settings"
              aria-label="Feed Settings"
            >
              <Settings size={14} />
              <span>Feed Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Header Hero Area */}
        <div className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-normal text-text">
                Today&apos;s News: Business &amp; Economy
              </h1>
              <p className="text-xs font-mono text-text-muted mt-1">
                Server-side RSS ingestion • Every 3 hours • The Hindu Business • {updatedLabel}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-leaf bg-leaf/10 border border-leaf/20 px-3 py-1 rounded">
              <Leaf size={14} />
              <span>Live AI Curriculum Tagging</span>
            </div>
          </div>
          <div className="mt-3">
            <PageHeaderBand />
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-surface rounded-lg border border-border p-4 mb-6 shadow-2xs">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Search headlines, MBA topics, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-bg border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subject Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              {[
                { label: "All Subjects", val: "all" },
                { label: "Macroeconomics", val: "ECO601" },
                { label: "Finance", val: "FIN601" },
                { label: "Operations", val: "OPM503" },
                { label: "Marketing", val: "MKT502" },
                { label: "Strategy", val: "STR601" },
              ].map((subj) => (
                <button
                  key={subj.val}
                  onClick={() => setSelectedSubject(subj.val)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedSubject === subj.val
                      ? "bg-primary text-white dark:text-[#141B2D] font-medium"
                      : "bg-bg text-text hover:bg-border/40"
                  }`}
                >
                  {subj.label}
                </button>
              ))}
            </div>

            {/* Toggle Saved Button */}
            <button
              onClick={() => setOnlySaved((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors shrink-0 ${
                onlySaved
                  ? "bg-leaf text-white font-medium"
                  : "bg-bg text-text border border-border hover:border-leaf/40"
              }`}
            >
              <Bookmark size={13} />
              <span>Saved Only</span>
            </button>
          </div>
        </div>

        {/* News Items List */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={24} className="animate-spin text-sindoor mx-auto mb-3" />
            <p className="font-heading text-lg text-text">Loading today&apos;s news...</p>
            <p className="text-xs font-body text-text-muted mt-1">
              Updating headlines and course tags
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-surface rounded-lg border border-border p-12 text-center my-6">
            <Newspaper size={40} className="text-text-muted mx-auto mb-3 opacity-40" />
            <h3 className="font-heading text-xl text-text">No articles found</h3>
            <p className="text-xs font-body text-text-muted mt-2 max-w-md mx-auto">
              {onlySaved
                ? "You haven't saved any current affairs articles yet. Browse all articles and click 'Save as card'."
                : "No articles matched your selected filters or search terms."}
            </p>
            {onlySaved && (
              <button
                onClick={() => setOnlySaved(false)}
                className="mt-4 px-4 py-2 rounded bg-sindoor text-white text-xs font-body font-medium hover:bg-sindoor/90"
              >
                View all articles
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedIds[item.id] || false;
              const isSaving = savingId === item.id;

              return (
                <article
                  key={item.id}
                  className="bg-surface rounded-lg border border-border p-5 hover:border-sindoor/30 transition-all duration-200 shadow-2xs"
                >
                  {/* Top metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo/10 text-indigo border border-indigo/20">
                        {item.subjectCode}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        • {item.topicName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono text-text-muted">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h2 className="font-heading text-xl font-normal text-text leading-snug">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-sindoor transition-colors inline-flex items-baseline space-x-1.5 group"
                    >
                      <span>{item.title}</span>
                      <ExternalLink
                        size={14}
                        className="inline-block opacity-0 group-hover:opacity-100 transition-opacity text-sindoor"
                      />
                    </a>
                  </h2>

                  {/* RSS summary */}
                  <p className="text-sm font-body text-text-muted mt-2 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* AI Curriculum Insights */}
                  <div className="mt-4 p-3.5 rounded bg-bg/80 border border-border/60 space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <Sparkles size={16} className="text-turmeric shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-body font-semibold text-text block mb-0.5">
                          Why it matters for your studies
                        </span>
                        <p className="text-xs sm:text-sm font-body text-text/90 leading-relaxed">
                          {item.whyItMatters}
                        </p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                        <div className="p-3 rounded bg-surface border border-border/60">
                          <div className="flex items-center space-x-1.5 text-leaf font-body text-xs font-semibold mb-1">
                            <MessageSquare size={13} />
                            <span>Group discussion prompt</span>
                          </div>
                          <p className="text-xs font-body text-text leading-relaxed">
                            {item.gdQuestion}
                          </p>
                        </div>

                        <div className="p-3 rounded bg-surface border border-border/60">
                          <div className="flex items-center space-x-1.5 text-indigo font-body text-xs font-semibold mb-1">
                            <HelpCircle size={13} />
                            <span>Interview perspective</span>
                          </div>
                          <p className="text-xs font-body text-text leading-relaxed">
                            {item.interviewQuestion}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSaveAsCard(item)}
                        disabled={isSaving}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                          item.isSaved
                            ? "bg-leaf/10 text-leaf border border-leaf/30 font-medium"
                            : "bg-surface border border-border text-text hover:border-sindoor/40 hover:text-sindoor"
                        }`}
                      >
                        {item.isSaved ? (
                          <>
                            <BookmarkCheck size={14} />
                            <span>Saved as Review Card</span>
                          </>
                        ) : (
                          <>
                            <Bookmark size={14} />
                            <span>{isSaving ? "Saving..." : "Save as card"}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center space-x-1 text-xs font-mono text-text-muted hover:text-text px-2 py-1.5 rounded hover:bg-bg transition-colors"
                      >
                        <span>{isExpanded ? "Hide Prompts" : "GD & Interview Prompts"}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-text-muted">Source:</span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-sindoor hover:underline inline-flex items-center space-x-1 font-medium"
                      >
                        <span>Read on The Hindu</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* FEED SETTINGS MODAL */}
      {showFeedsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface rounded-lg border border-border max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Settings size={18} className="text-sindoor" />
                <h3 className="font-heading text-lg font-medium text-text">RSS Feed Sources</h3>
              </div>
              <button
                onClick={() => setShowFeedsModal(false)}
                className="text-text-muted hover:text-text font-mono text-xs px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs font-mono text-text-muted mt-2">
              Configured newspaper feeds. Server fetches summaries every 3 hours without storing full articles.
            </p>

            {/* Existing Feeds */}
            <div className="mt-4 space-y-2">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center justify-between p-3 rounded bg-bg border border-border text-xs font-mono"
                >
                  <div className="pr-3 truncate">
                    <div className="font-semibold text-text">{feed.name}</div>
                    <div className="text-text-muted truncate text-[11px]">{feed.url}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="text-text-muted hover:text-sindoor p-1 rounded transition-colors"
                    title="Remove feed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Feed Form */}
            <form onSubmit={handleAddFeed} className="mt-6 pt-4 border-t border-border space-y-3">
              <h4 className="text-xs font-body font-semibold text-text">
                Add RSS feed
              </h4>

              {feedError && <p className="text-xs font-mono text-sindoor">{feedError}</p>}
              {feedSuccess && <p className="text-xs font-mono text-leaf">{feedSuccess}</p>}

              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Feed Name (e.g., LiveMint Economy)
                </label>
                <input
                  type="text"
                  required
                  placeholder="The Hindu - Industry"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-bg border border-border rounded focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/rss/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-bg border border-border rounded focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Category
                </label>
                <select
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-bg border border-border rounded focus:ring-1 focus:ring-primary"
                >
                  <option value="Business">Business</option>
                  <option value="Economy">Economy</option>
                  <option value="Industry">Industry</option>
                  <option value="Markets">Markets</option>
                  <option value="Policy">Policy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-sindoor text-white text-xs font-mono font-medium rounded hover:bg-sindoor/90 transition-colors"
              >
                Add RSS Feed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WEEKLY QUIZ MODAL */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface rounded-lg border border-border max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Award size={18} className="text-turmeric-dark" />
                <h3 className="font-heading text-lg font-medium text-text">
                  Weekly Current Affairs Quiz (10 Questions)
                </h3>
              </div>
              <button
                onClick={() => setShowQuizModal(false)}
                className="text-text-muted hover:text-text font-mono text-xs px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            {quizLoading ? (
              <div className="py-12 text-center">
                <RefreshCw size={24} className="animate-spin text-sindoor mx-auto mb-2" />
                <p className="text-xs font-mono text-text-muted">
                  Preparing 10-question quiz from saved current affairs items...
                </p>
              </div>
            ) : !quizData || !quizData.questions || quizData.questions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-heading text-base text-text">No quiz questions available yet.</p>
                <p className="text-xs font-mono text-text-muted mt-1">
                  Save a few news items as review cards to build your current affairs quiz pool!
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {quizSubmitted && (
                  <div className="p-4 rounded bg-turmeric/15 border border-turmeric/30 text-center">
                    <p className="font-heading text-xl text-text">
                      Quiz Completed! Score: {quizScore} / {quizData.questions.length} (
                      {Math.round(((quizScore || 0) / quizData.questions.length) * 100)}%)
                    </p>
                    <p className="text-xs font-mono text-text-muted mt-1">
                      Your current affairs answers have been recorded in your study history.
                    </p>
                  </div>
                )}

                {quizData.questions.map((q, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-4 rounded bg-bg border border-border/80 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-sindoor">
                          Q{qIdx + 1}
                        </span>
                        {quizSubmitted && (
                          <span>
                            {isCorrect ? (
                              <CheckCircle2 size={16} className="text-leaf" />
                            ) : (
                              <XCircle size={16} className="text-sindoor" />
                            )}
                          </span>
                        )}
                      </div>

                      <p className="font-heading text-sm text-text leading-snug">
                        {q.question}
                      </p>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selected === optIdx;
                          let optStyle =
                            "bg-surface border-border hover:border-sindoor/40 text-text";

                          if (quizSubmitted) {
                            if (optIdx === q.correctIndex) {
                              optStyle = "bg-leaf/15 border-leaf text-leaf font-medium";
                            } else if (isOptionSelected) {
                              optStyle = "bg-sindoor/15 border-sindoor text-sindoor";
                            } else {
                              optStyle = "bg-surface/50 border-border/40 text-text-muted opacity-60";
                            }
                          } else if (isOptionSelected) {
                            optStyle = "bg-sindoor/10 border-sindoor text-text font-medium";
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                              }
                              className={`w-full text-left p-2.5 rounded border text-xs font-body transition-colors flex items-start space-x-2 ${optStyle}`}
                            >
                              <span className="font-mono font-bold text-[11px] text-text-muted shrink-0">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <p className="text-[11px] font-mono text-text-muted pt-2 border-t border-border/40">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}

                {!quizSubmitted ? (
                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length < quizData.questions.length}
                    className="w-full py-2.5 rounded bg-sindoor text-white font-body text-xs font-semibold disabled:opacity-50 hover:bg-sindoor/90 transition-colors"
                  >
                    Submit Quiz Answers (
                    {Object.keys(quizAnswers).length} / {quizData.questions.length} answered)
                  </button>
                ) : (
                  <button
                    onClick={() => setShowQuizModal(false)}
                    className="w-full py-2.5 rounded bg-surface border border-border text-text font-body text-xs font-semibold hover:bg-bg transition-colors"
                  >
                    Close Quiz
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
