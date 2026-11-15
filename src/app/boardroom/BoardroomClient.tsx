"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Mic,
  FileCheck,
  Share2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Coins,
  Compass,
} from "lucide-react";
import { TutorChat } from "@/components/boardroom/TutorChat";
import { ColdCallSimulator } from "@/components/boardroom/ColdCallSimulator";
import { AnswerGraderView } from "@/components/boardroom/AnswerGraderView";
import { ConceptGraph } from "@/components/boardroom/ConceptGraph";
import { ExamModeView } from "@/components/boardroom/ExamModeView";
import { FrameworkFinderView } from "@/components/boardroom/FrameworkFinderView";

interface BoardroomClientProps {
  initialTab?: string;
  subjects: { id: string; name: string; code: string }[];
  decks: { id: string; title: string; subjectId: string }[];
  dailyBudgetCost: number;
  consumedBudgetCost: number;
}

export const BoardroomClient: React.FC<BoardroomClientProps> = ({
  initialTab = "tutor",
  subjects,
  decks,
  dailyBudgetCost = 0.50,
  consumedBudgetCost = 0.0,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const budgetPercent = Math.min(100, Math.round((consumedBudgetCost / dailyBudgetCost) * 100));

  const tabs = [
    { id: "tutor", label: "AI Study Tutor", icon: MessageSquare },
    { id: "frameworks", label: "Find a framework", icon: Compass },
    { id: "cold-call", label: "Discussion Drill (Cold Call)", icon: Mic },
    { id: "grader", label: "Answer Grader", icon: FileCheck },
    { id: "graph", label: "Topic Graph", icon: Share2 },
    { id: "exam", label: "Practice Exams", icon: Calendar },
  ];

  return (
    <div className="space-y-6 font-body">
      {/* Top Ledger Navigation Tabs & Budget Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[3px] text-xs font-mono transition-all ${
                  isActive
                    ? "bg-sindoor text-white font-bold shadow-xs"
                    : "border border-border bg-surface text-text hover:bg-bg/60"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Budget Governance Tile */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded border border-border bg-surface text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Coins size={14} className="text-turmeric" />
            <span>AI Budget:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-16 h-2 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full ${budgetPercent > 80 ? "bg-sindoor" : "bg-leaf"} transition-all`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <span className="font-bold text-text">
              ${consumedBudgetCost.toFixed(3)} / ${dailyBudgetCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "tutor" && <TutorChat subjects={subjects} decks={decks} />}
        {activeTab === "frameworks" && <FrameworkFinderView />}
        {activeTab === "cold-call" && <ColdCallSimulator />}
        {activeTab === "grader" && <AnswerGraderView subjects={subjects} />}
        {activeTab === "graph" && <ConceptGraph />}
        {activeTab === "exam" && <ExamModeView subjects={subjects} decks={decks} />}
      </div>
    </div>
  );
};
