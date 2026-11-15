"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, themeMode, toggleTheme } = useTheme();

  const getTitle = () => {
    if (themeMode === "auto") {
      return `Theme: Auto (following system: ${theme})`;
    }
    return `Theme: ${theme === "light" ? "Light" : "Dark"}`;
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch theme (currently ${themeMode})`}
      title={getTitle()}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded border border-border/70 bg-surface/60 hover:bg-surface text-text transition-colors focus:outline-none focus:ring-1 focus:ring-cobalt/40 active:scale-95 shrink-0 ${className}`}
    >
      {theme === "dark" ? (
        <Moon size={15} className="text-marigold" />
      ) : (
        <Sun size={15} className="text-cobalt" />
      )}

      {/* Auto mode indicator */}
      {themeMode === "auto" && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary"
          title="Auto theme (system)"
        />
      )}
    </button>
  );
};

export default ThemeToggle;
