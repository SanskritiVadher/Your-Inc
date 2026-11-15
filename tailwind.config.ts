import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        cobalt: {
          DEFAULT: "var(--color-cobalt)",
          light: "#7FA6E0",
          dark: "#1F4E8C",
        },
        turquoise: {
          DEFAULT: "var(--color-turquoise)",
          light: "#6CC4C2",
          dark: "#3A9C9F",
        },
        marigold: {
          DEFAULT: "var(--color-marigold)",
          light: "#F0BE6A",
          dark: "#E3A33B",
        },
        terracotta: {
          DEFAULT: "var(--color-terracotta)",
          light: "#D8725B",
          dark: "#B5523B",
        },
        // Backwards compatibility with previous motif tokens
        sindoor: {
          DEFAULT: "var(--color-cobalt)",
          light: "#7FA6E0",
          dark: "#1F4E8C",
        },
        leaf: {
          DEFAULT: "var(--color-turquoise)",
          light: "#6CC4C2",
          dark: "#3A9C9F",
        },
        turmeric: {
          DEFAULT: "var(--color-marigold)",
          light: "#F0BE6A",
          dark: "#E3A33B",
        },
        indigo: {
          DEFAULT: "var(--color-cobalt)",
          light: "#7FA6E0",
          dark: "#1F4E8C",
        },
      },
      fontFamily: {
        heading: ["var(--font-rozha)", "serif"],
        body: ["var(--font-mukta)", "sans-serif"],
        kalam: ["var(--font-kalam)", "cursive"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
        lg: "6px",
      },
      animation: {
        "ticker": "ticker 35s linear infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "page-turn": "pageTurn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
        pageTurn: {
          "0%": { transform: "rotateY(0deg)", transformOrigin: "left center" },
          "100%": { transform: "rotateY(-95deg)", transformOrigin: "left center", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
