"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send,
  Square,
  Sparkles,
  BookOpen,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Brain,
  ShieldAlert,
  Coins,
} from "lucide-react";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { useToast } from "@/components/ui/Toast";

interface CitationChip {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  deckId?: string;
  slideNumber?: number;
  noteId?: string;
  conceptId?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "advisor";
  text: string;
  inMaterial?: boolean;
  citations?: CitationChip[];
  timestamp: string;
}

interface TutorChatProps {
  subjects?: { id: string; name: string; code: string }[];
  decks?: { id: string; title: string; subjectId: string }[];
}

export const TutorChat: React.FC<TutorChatProps> = ({
  subjects = [],
  decks = [],
}) => {
  const { error: toastError, info } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "advisor",
      text: "Welcome to the Boardroom. I am your academic advisor and case counsel. Every response is grounded directly in your ingested lecture decks, classroom notes, and professor guidelines. Ask any conceptual question, case scenario, or exam formulation.",
      inMaterial: true,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [scope, setScope] = useState<"all" | "subject" | "deck">("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [style, setStyle] = useState<"simple" | "exam" | "deep_dive">("simple");

  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Budget tracking state
  const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Handle send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;

    const query = inputText.trim();
    setInputText("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Setup streaming response
    const controller = new AbortController();
    setAbortController(controller);
    setIsStreaming(true);

    const advisorMsgId = `advisor-${Date.now()}`;
    const initialAdvisorMsg: ChatMessage = {
      id: advisorMsgId,
      sender: "advisor",
      text: "",
      inMaterial: true,
      citations: [],
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, initialAdvisorMsg]);

    try {
      const res = await fetch("/api/boardroom/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          scope,
          subjectId: selectedSubjectId || null,
          deckId: selectedDeckId || null,
          style,
        }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === advisorMsgId
              ? {
                  ...msg,
                  text: data.message || "Daily AI budget allocation reached. Please return tomorrow.",
                  inMaterial: false,
                }
              : msg
          )
        );
        setIsStreaming(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to receive advisor response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream unreadable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: meta")) {
            const dataStr = line.replace("event: meta\ndata: ", "");
            try {
              const meta = JSON.parse(dataStr);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === advisorMsgId
                    ? { ...m, inMaterial: meta.inMaterial, citations: meta.citations || [] }
                    : m
                )
              );
            } catch {
              // ignore
            }
          } else if (line.startsWith("event: chunk")) {
            const dataStr = line.replace("event: chunk\ndata: ", "");
            try {
              const chunk = JSON.parse(dataStr);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === advisorMsgId
                    ? { ...m, text: m.text + chunk.text }
                    : m
                )
              );
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        toastError((err as Error)?.message || "Failed to stream chat response");
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      info("Advisor generation stopped.");
    }
  };

  const filteredDecks = selectedSubjectId
    ? decks.filter((d) => d.subjectId === selectedSubjectId)
    : decks;

  return (
    <div className="flex flex-col h-[740px] rounded-lg border border-border bg-surface shadow-md overflow-hidden font-body">
      {/* Top Controls Bar */}
      <div className="p-3.5 border-b border-border bg-bg/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-text-muted">Scope:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "all" | "subject" | "deck")}
              className="p-1.5 rounded bg-surface border border-border text-text font-mono focus:outline-none focus:border-sindoor"
            >
              <option value="all">Entire Degree (All Departments)</option>
              <option value="subject">Specific Department</option>
              <option value="deck">Specific Lecture Deck</option>
            </select>
          </div>

          {scope !== "all" && subjects.length > 0 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedDeckId("");
              }}
              className="p-1.5 rounded bg-surface border border-border text-text font-mono text-[11px] focus:outline-none focus:border-sindoor max-w-[180px]"
            >
              <option value="">Select Department</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          )}

          {scope === "deck" && filteredDecks.length > 0 && (
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="p-1.5 rounded bg-surface border border-border text-text font-mono text-[11px] focus:outline-none focus:border-sindoor max-w-[180px]"
            >
              <option value="">Select Deck</option>
              {filteredDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-text-muted">Style:</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as "simple" | "exam" | "deep_dive")}
            className="p-1.5 rounded bg-surface border border-border text-text font-mono focus:outline-none focus:border-sindoor"
          >
            <option value="simple">Simple & Direct</option>
            <option value="exam">Exam Style (3-Point Structure)</option>
            <option value="deep_dive">Executive Deep Dive</option>
          </select>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
            >
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-text-muted">
                <span>{isUser ? "Student" : "Boardroom Academic Advisor"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-2xl p-4 rounded-[4px] leading-relaxed text-sm ${
                  isUser
                    ? "bg-turmeric/10 border border-turmeric/30 text-text"
                    : "bg-surface border border-border text-text shadow-xs"
                }`}
              >
                {/* Out of material disclaimer */}
                {!isUser && msg.inMaterial === false && (
                  <div className="mb-2.5 pb-2 border-b border-sindoor/30 text-xs font-mono text-sindoor font-semibold flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>Not in your course material. Answering from general MBA knowledge:</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{msg.text || (isStreaming ? "Synthesizing answer..." : "")}</div>

                {/* Clickable Citation Chips */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-2.5 border-t border-border flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider mr-1">
                      Citations:
                    </span>
                    {msg.citations.map((cite) => (
                      <Link
                        key={cite.id}
                        href={
                          cite.deckId
                            ? `/decks/${cite.deckId}?slide=${cite.slideNumber || 1}`
                            : cite.noteId
                            ? `/notes`
                            : `/departments`
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg border border-border hover:border-sindoor text-[10px] font-mono text-text transition-colors"
                        title={cite.subtitle}
                      >
                        <BookOpen size={10} className="text-sindoor" />
                        <span>{cite.title}</span>
                        <ExternalLink size={9} className="text-text-muted" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Action Footer */}
      <div className="p-3 sm:p-4 border-t border-border bg-surface">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="relative flex items-center">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a question grounded in your course slides, notes, or case frameworks... (Press Enter)"
              rows={2}
              className="w-full p-3 pr-24 rounded bg-bg border border-border text-sm font-body text-text focus:outline-none focus:border-sindoor resize-none leading-relaxed"
            />

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="px-3 py-1.5 rounded bg-sindoor/15 text-sindoor border border-sindoor/40 font-mono text-xs font-semibold hover:bg-sindoor/25 transition-colors flex items-center gap-1"
                >
                  <Square size={12} fill="currentColor" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-3 py-1.5 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
                >
                  <Send size={12} />
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted px-1">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-turmeric" />
              <span>Hybrid Vector + Keyword RAG • Grounded exclusively in your lecture materials</span>
            </span>
            <span>Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
};
