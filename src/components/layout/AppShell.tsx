"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Building2,
  RotateCcw,
  CalendarCheck2,
  MessageSquare,
  Command,
  Upload,
} from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { useTheme } from "../theme/ThemeProvider";
import { CommandPalette } from "../ui/CommandPalette";
import { FeedbackModal } from "./FeedbackModal";
import { MoreMenu } from "./MoreMenu";

interface AppShellProps {
  children: React.ReactNode;
  userCompanyName?: string;
  userName?: string;
  creditRating?: string;
  totalDeadlines?: number;
  isAdmin?: boolean;
  locationEnabled?: boolean;
  hasCohort?: boolean;
  hasCareer?: boolean;
  deckCount?: number;
  tickerItems?: any[]; // Keep interface compatible if passed
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  userCompanyName = "You Inc.",
  userName = "Student",
  creditRating = "AAA",
  totalDeadlines = 0,
  isAdmin = false,
  locationEnabled = false,
  hasCohort = false,
  hasCareer = false,
  deckCount = 1,
}) => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [modKey, setModKey] = React.useState("Ctrl");

  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(
        navigator.userAgent || navigator.platform || ""
      )
    ) {
      setModKey("⌘");
    }
  }, []);

  // Progressive disclosure:
  // First week: show only Today, Subjects, Study.
  // Plan and Ask appear after the first deck upload (deckCount > 0).
  const hasUploadedDeck = deckCount > 0;

  // 5 primary items:
  // - Today (dashboard)
  // - Subjects (each subject contains its decks, topics, notes, assignments)
  // - Study (review session, practice questions, exam mode)
  // - Plan (calendar, assignments, group projects) -> visible after 1st deck
  // - Ask (AI tutor) -> visible after 1st deck
  const primaryNavItems = [
    { label: "Today", href: "/", icon: CalendarDays },
    { label: "Subjects", href: "/departments", icon: Building2 },
    { label: "Upload deck", href: "/decks", icon: Upload },
    { label: "Review", href: "/review", icon: RotateCcw },
    { label: "Ask", href: "/boardroom", icon: MessageSquare },
  ];

  // Plain language deadline status
  const deadlineStatus =
    totalDeadlines === 0
      ? { label: "Not enough data yet", color: "text-text-muted", badge: "bg-surface border-border" }
      : ["AAA", "AA", "A"].includes(creditRating)
      ? { label: "On track", color: "text-leaf", badge: "bg-leaf/10 border-leaf/30" }
      : ["BBB", "BB"].includes(creditRating)
      ? { label: "Slipping", color: "text-turmeric", badge: "bg-turmeric/10 border-turmeric/30" }
      : { label: "Behind", color: "text-sindoor", badge: "bg-sindoor/10 border-sindoor/30" };

  const userInitial = (userName || "S").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-turmeric/20 overflow-x-hidden">
      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto">
        {/* Desktop Left Rail - 5 clean items */}
        <aside
          aria-label="Degree Navigation"
          className="hidden md:flex w-64 flex-col justify-between border-r border-border bg-surface/70 py-6 px-4 relative shrink-0"
        >
          <div>
            {/* Header / Identity */}
            <div className="pb-6 border-b border-border/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-cobalt/10 text-cobalt flex items-center justify-center font-heading text-sm font-medium shrink-0">
                  {userCompanyName.charAt(0) || "Y"}
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-lg font-normal tracking-wide text-text truncate">
                    {userCompanyName}
                  </h1>
                  <p className="font-body text-xs text-text-muted">
                    Study Notebook
                  </p>
                </div>
              </div>

              {/* Deadline Status Badge */}
              <div
                className={`mt-3 inline-flex items-center space-x-2 px-2.5 py-1 rounded border text-xs font-body ${deadlineStatus.badge}`}
                title={totalDeadlines > 0 ? `Credit rating: ${creditRating}` : "Add an assignment in Plan to start tracking deadlines"}
              >
                <span className="text-text-muted">Deadline record:</span>
                <span className={`font-medium ${deadlineStatus.color}`}>{deadlineStatus.label}</span>
              </div>
            </div>

            {/* 5-item Simplified Navigation */}
            <nav className="mt-6 space-y-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded text-sm font-body font-medium transition-colors ${
                      isActive
                        ? "bg-bg text-cobalt border-l-2 border-cobalt shadow-2xs"
                        : "text-text-muted hover:text-text hover:bg-bg/50"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-cobalt" : "text-text-muted"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Toolbar with More Menu Profile Avatar & Theme toggle */}
          <div className="pl-6 pt-6 border-t border-border/60">
            <div className="flex items-center justify-between">
              {/* More Menu (under profile avatar) */}
              <MoreMenu
                userInitial={userInitial}
                userName={userName}
                isAdmin={isAdmin}
                locationEnabled={locationEnabled}
                hasCohort={hasCohort}
                hasCareer={hasCareer}
              />

              <div className="flex items-center space-x-1.5">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => {
                    const event = new KeyboardEvent("keydown", {
                      key: "k",
                      metaKey: true,
                      ctrlKey: true,
                      bubbles: true,
                    });
                    window.dispatchEvent(event);
                  }}
                  title={`Command Palette (${modKey === "⌘" ? "⌘K" : "Ctrl K"})`}
                  aria-label={`Command Palette (${modKey === "⌘" ? "⌘K" : "Ctrl K"})`}
                  className="h-8 px-2 rounded border border-border/70 text-text-muted hover:text-text hover:bg-surface transition-colors font-body text-xs flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <Command size={13} />
                  <span className="text-[11px] font-medium">{modKey === "⌘" ? "⌘K" : "Ctrl K"}</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Surface */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (5 items max + More menu) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 border-t border-border backdrop-blur-md px-3 py-1.5 flex items-center justify-between"
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 text-xs font-body ${
                isActive ? "text-cobalt font-medium" : "text-text-muted"
              }`}
            >
              <Icon size={18} />
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        <div className="pl-1">
          <MoreMenu
            userInitial={userInitial}
            userName={userName}
            isAdmin={isAdmin}
            locationEnabled={locationEnabled}
            hasCohort={hasCohort}
            hasCareer={hasCareer}
          />
        </div>
      </nav>

      {/* Global Command Palette & Feedback Modal */}
      <FeedbackModal />
      <CommandPalette />
    </div>
  );
};

export default AppShell;
