"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type EffectiveTheme = "light" | "dark";

interface ThemeContextType {
  theme: EffectiveTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: EffectiveTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  themeMode: "auto",
  toggleTheme: () => {},
  setTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Determine OS prefers-color-scheme setting
  const getSystemTheme = useCallback((): EffectiveTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  // Apply effective theme to DOM classList
  const applyTheme = useCallback((mode: ThemeMode, sysTheme?: EffectiveTheme) => {
    const effective: EffectiveTheme = mode === "auto" ? (sysTheme || getSystemTheme()) : mode;
    setEffectiveTheme(effective);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", effective === "dark");
    }
  }, [getSystemTheme]);

  // 1. Initialize from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("you-inc-theme-mode") as ThemeMode | null;
    const initialMode: ThemeMode =
      savedMode === "light" || savedMode === "dark" || savedMode === "auto"
        ? savedMode
        : "auto";
    setThemeModeState(initialMode);
    applyTheme(initialMode);
    setMounted(true);
  }, [applyTheme]);

  // 2. React to OS prefers-color-scheme changes when in auto mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      if (themeMode === "auto") {
        const newTheme: EffectiveTheme = e.matches ? "dark" : "light";
        applyTheme("auto", newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode, applyTheme]);

  const setThemeMode = (newMode: ThemeMode) => {
    setThemeModeState(newMode);
    localStorage.setItem("you-inc-theme-mode", newMode);
    applyTheme(newMode);
  };

  const setTheme = (newTheme: EffectiveTheme) => {
    setThemeMode(newTheme);
  };

  const toggleTheme = () => {
    if (themeMode === "light") {
      setThemeMode("dark");
    } else if (themeMode === "dark") {
      setThemeMode("auto");
    } else {
      setThemeMode("light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: effectiveTheme,
        themeMode,
        toggleTheme,
        setTheme,
        setThemeMode,
      }}
    >
      <div style={{ visibility: mounted ? "visible" : "visible" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
