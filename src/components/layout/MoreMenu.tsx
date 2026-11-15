"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Newspaper,
  MapPin,
  GraduationCap,
  FileSpreadsheet,
  Brain,
  ShieldAlert,
  Settings,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  BookMarked,
  Calculator,
} from "lucide-react";

interface MoreMenuProps {
  userInitial?: string;
  userName?: string;
  isAdmin?: boolean;
  locationEnabled?: boolean;
  hasCohort?: boolean;
  hasCareer?: boolean;
  onOpenSettings?: () => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  userInitial = "S",
  userName = "Student",
  isAdmin = false,
  locationEnabled = false,
  hasCohort = false,
  hasCareer = false,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Secondary items moved into More menu:
  // Career, News, Map, Cohort, Reports, Memory, Settings, Admin
  const moreItems = [
    // Library (All semesters in one place)
    {
      label: "Library",
      href: "/library",
      icon: BookMarked,
      desc: "Decks & notes across all semesters",
      show: true,
    },
    // Formula sheet (hidden from navigation per feature flags)
    {
      label: "Formula sheet",
      href: "/library?tab=formulas",
      icon: Calculator,
      desc: "Key formulas & variable meanings",
      show: false,
    },
    // News (hidden from navigation per feature flags)
    {
      label: "Daily News",
      href: "/news",
      icon: Newspaper,
      desc: "Daily business news",
      show: false,
    },
    // Weekly Report
    {
      label: "Weekly Report",
      href: "/reports",
      icon: FileSpreadsheet,
      desc: "Weekly learning summary",
      show: true,
    },
    // Memory
    {
      label: "Memory & Notes",
      href: "/memory",
      icon: Brain,
      desc: "Faculty notes, patterns & key context",
      show: false,
    },
    // Career (hidden from navigation per feature flags)
    {
      label: "Career Proof",
      href: "/career",
      icon: Briefcase,
      desc: "Target roles & verified portfolio",
      show: false,
    },
    // Map (hidden from navigation per feature flags)
    {
      label: "Campus Focus Map",
      href: "/map",
      icon: MapPin,
      desc: "Campus study zones",
      show: false,
    },
    // Cohort (hidden from navigation per feature flags)
    {
      label: "Class Group",
      href: "/cohort",
      icon: GraduationCap,
      desc: "Classmates, shared decks & schedule",
      show: false,
    },
    // Admin (admin users only)
    {
      label: "Admin Panel",
      href: "/admin",
      icon: ShieldAlert,
      desc: "System metrics, users & activity",
      show: false,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-full border border-border bg-surface hover:border-primary/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="User profile and more features menu"
        title="More features & settings"
      >
        <div className="w-8 h-8 rounded-full bg-sindoor/15 text-sindoor font-heading font-bold text-sm flex items-center justify-center border border-sindoor/30 shadow-xs">
          {userInitial}
        </div>
        <span className="hidden lg:inline text-xs font-mono text-text max-w-[100px] truncate">
          {userName.split(" ")[0]}
        </span>
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="absolute right-0 bottom-full md:bottom-auto md:top-full mb-2 md:mb-0 md:mt-2 w-72 rounded-lg border border-border bg-surface shadow-2xl z-50 overflow-hidden font-body text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-border/80 bg-bg/50">
            <div className="font-heading text-sm text-text font-normal truncate">
              {userName}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              More features &amp; settings
            </p>
          </div>

          {/* List of features */}
          <div className="p-1 max-h-80 overflow-y-auto space-y-0.5">
            {moreItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-2 rounded hover:bg-bg/80 text-text transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1 rounded bg-surface border border-border group-hover:border-cobalt/40 group-hover:text-cobalt transition-colors shrink-0">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text group-hover:text-cobalt truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-text-muted/50 group-hover:text-cobalt shrink-0 ml-1" />
                  </Link>
                );
              })}

            {/* Report a Problem */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.dispatchEvent(new CustomEvent("open-feedback-modal"));
              }}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-bg/80 text-text transition-colors group text-left"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1 rounded bg-surface border border-border group-hover:border-cobalt/40 group-hover:text-cobalt transition-colors shrink-0">
                  <MessageSquare size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text group-hover:text-cobalt truncate">
                    Report a Problem
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    Share feedback or report an issue
                  </div>
                </div>
              </div>
              <ChevronRight size={13} className="text-text-muted/50 group-hover:text-cobalt shrink-0 ml-1" />
            </button>
          </div>

          {/* Settings Footer */}
          <div className="p-2 border-t border-border/80 bg-bg/40 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenSettings) onOpenSettings();
                else window.location.href = "/settings";
              }}
              className="flex items-center space-x-1.5 text-[11px] text-text-muted hover:text-text px-2 py-1 rounded transition-colors whitespace-nowrap"
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>
            <span className="text-[10px] text-text-muted/60">Journal v2</span>
          </div>
        </div>
      )}
    </div>
  );
};
