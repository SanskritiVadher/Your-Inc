"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme/ThemeProvider";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  RotateCcw,
  CalendarCheck2,
  Users,
  Briefcase,
  Brain,
  MapPin,
  FileSpreadsheet,
  Palette,
  Sun,
  Search,
  X,
  BookMarked,
  BookOpen,
  FileText,
  CheckCircle2,
  Settings,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "Navigation" | "Actions" | "System" | "Across Semesters";
  semesterLabel?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CommandItem[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { toggleTheme, theme } = useTheme();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Global search across all semesters
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/library?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items || [];

        const dynamicCommands: CommandItem[] = items.slice(0, 10).map((item: any) => {
          let icon = <BookOpen size={16} className="text-cobalt" />;
          if (item.type === "note") icon = <FileText size={16} className="text-leaf" />;
          if (item.type === "project") icon = <Briefcase size={16} className="text-turmeric" />;
          if (item.type === "topic") icon = <CheckCircle2 size={16} className="text-turquoise" />;
          if (item.type === "assignment") icon = <CalendarCheck2 size={16} className="text-sindoor" />;

          return {
            id: `lib-${item.type}-${item.id}`,
            title: item.title,
            subtitle: `${item.subjectCode} · ${item.subtitle}`,
            icon,
            category: "Across Semesters",
            semesterLabel: item.semesterName || "Semester 1",
            action: () => {
              router.push(item.url);
              setIsOpen(false);
            },
          };
        });

        setSearchResults(dynamicCommands);
      } catch (e) {
        console.error("Global search error:", e);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, router]);

  const commands: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "Dashboard",
      subtitle: "Overview of your study dashboard and subjects",
      icon: <LayoutDashboard size={18} className="text-sindoor" />,
      category: "Navigation",
      action: () => {
        router.push("/");
        setIsOpen(false);
      },
    },
    {
      id: "nav-library",
      title: "Library (All Semesters)",
      subtitle: "Universal repository of decks, notes, and projects across all semesters",
      icon: <BookMarked size={18} className="text-cobalt" />,
      category: "Navigation",
      action: () => {
        router.push("/library");
        setIsOpen(false);
      },
    },
    {
      id: "nav-semesters",
      title: "Semesters (Settings)",
      subtitle: "Manage academic semesters, dates, and archival wrap-ups",
      icon: <Settings size={18} className="text-leaf" />,
      category: "Navigation",
      action: () => {
        router.push("/settings?tab=semesters");
        setIsOpen(false);
      },
    },
    {
      id: "nav-departments",
      title: "Departments (Subjects)",
      subtitle: "Manage subjects, topics and faculty notes",
      icon: <Building2 size={18} className="text-turmeric" />,
      category: "Navigation",
      action: () => {
        router.push("/departments");
        setIsOpen(false);
      },
    },
    {
      id: "nav-decks",
      title: "Lecture Decks",
      subtitle: "Upload class slides and prepare review cards",
      icon: <FolderOpen size={18} className="text-leaf" />,
      category: "Navigation",
      action: () => {
        router.push("/decks");
        setIsOpen(false);
      },
    },
    {
      id: "nav-review",
      title: "Study & Review",
      subtitle: "Daily review session to keep concepts fresh",
      icon: <RotateCcw size={18} className="text-sindoor" />,
      category: "Navigation",
      action: () => {
        router.push("/review");
        setIsOpen(false);
      },
    },
    {
      id: "nav-planner",
      title: "Operations Planner",
      subtitle: "Deadlines, assignments and credit rating maintenance",
      icon: <CalendarCheck2 size={18} className="text-indigo" />,
      category: "Navigation",
      action: () => {
        router.push("/planner");
        setIsOpen(false);
      },
    },
    {
      id: "nav-boardroom",
      title: "AI Tutor & Practice",
      subtitle: "Practice with AI tutor and classmates",
      icon: <Users size={18} className="text-turmeric" />,
      category: "Navigation",
      action: () => {
        router.push("/boardroom");
        setIsOpen(false);
      },
    },
    {
      id: "nav-career",
      title: "Career Vault & Mock Interviews",
      subtitle: "Turn concept assets into interview-ready competencies",
      icon: <Briefcase size={18} className="text-indigo" />,
      category: "Navigation",
      action: () => {
        router.push("/career");
        setIsOpen(false);
      },
    },
    {
      id: "nav-memory",
      title: "What You Inc. Knows (Memory Vault)",
      subtitle: "Review durable professor habits, answering rules & pitfalls",
      icon: <Brain size={18} className="text-turmeric" />,
      category: "Navigation",
      action: () => {
        router.push("/memory");
        setIsOpen(false);
      },
    },
    {
      id: "nav-map",
      title: "Campus Study Map",
      subtitle: "Study focus zones and localized field cases",
      icon: <MapPin size={18} className="text-leaf" />,
      category: "Navigation",
      action: () => {
        router.push("/map");
        setIsOpen(false);
      },
    },
    {
      id: "nav-reports",
      title: "Quarterly Results Reports",
      subtitle: "Weekly executive briefing and audit report",
      icon: <FileSpreadsheet size={18} className="text-sindoor" />,
      category: "Navigation",
      action: () => {
        router.push("/reports");
        setIsOpen(false);
      },
    },
    {
      id: "nav-design",
      title: "Design System Showcase",
      subtitle: "Tokens, borders and components",
      icon: <Palette size={18} className="text-turmeric" />,
      category: "System",
      action: () => {
        router.push("/design");
        setIsOpen(false);
      },
    },
    {
      id: "act-theme",
      title: `Switch Theme to ${theme === "light" ? "Dark" : "Light"}`,
      subtitle: "Toggle visual presentation between light and dark palettes",
      icon: <Sun size={18} className="text-turmeric" />,
      category: "Actions",
      action: () => {
        toggleTheme();
        setIsOpen(false);
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase())) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const displayList = query.trim().length >= 2 ? [...searchResults, ...filtered] : filtered;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 bg-black/60 backdrop-blur-xs p-4"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Menu"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[3px] border border-border bg-surface shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-4 py-3 bg-surface/90">
          <Search size={18} className="text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search across all semesters, topics, decks, or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent font-body text-base text-text placeholder:text-text-muted/60 focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close command palette"
            className="p-1 rounded text-text-muted hover:text-text hover:bg-bg/60"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/20">
          {displayList.length === 0 ? (
            <div className="py-8 text-center text-sm font-body text-text-muted italic">
              No results match &ldquo;{query}&rdquo;
            </div>
          ) : (
            displayList.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full text-left px-3 py-2.5 rounded flex items-center justify-between hover:bg-bg/80 focus:bg-bg focus:outline-none transition-colors group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="shrink-0 p-1.5 rounded bg-bg/70 border border-border/40">
                    {cmd.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text group-hover:text-cobalt transition-colors truncate">
                        {cmd.title}
                      </p>
                      {cmd.semesterLabel && (
                        <span className="text-[10px] font-body px-1.5 py-0.2 rounded bg-border/40 text-text font-medium whitespace-nowrap shrink-0">
                          {cmd.semesterLabel}
                        </span>
                      )}
                    </div>
                    {cmd.subtitle && (
                      <p className="text-xs text-text-muted line-clamp-1">
                        {cmd.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-body px-2 py-0.5 rounded border border-border/50 text-text-muted whitespace-nowrap shrink-0 ml-2">
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="border-t border-border px-4 py-2 bg-bg/50 flex items-center justify-between text-xs font-body text-text-muted">
          <span>Navigate with ↑ ↓ and Enter</span>
          <span>Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
