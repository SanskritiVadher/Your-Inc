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
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "#4A5825",
          light: "#A3B46A",
          dark: "#5B6B2E",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "#D08A6E",
          dark: "#7A3B24",
        },
        kattha: {
          DEFAULT: "var(--color-accent)",
          light: "#D08A6E",
          dark: "#7A3B24",
        },
        mehendi: {
          DEFAULT: "var(--color-primary)",
          light: "#A3B46A",
          dark: "#5B6B2E",
        },
        haldi: {
          DEFAULT: "var(--color-haldi)",
          light: "#E2B85C",
          dark: "#C8962E",
        },
        progress: {
          DEFAULT: "var(--color-progress)",
          light: "#E2B85C",
          dark: "#C8962E",
        },
        cobalt: {
          DEFAULT: "var(--color-primary)",
          hover: "#4A5825",
          light: "#A3B46A",
          dark: "#5B6B2E",
        },
        turquoise: {
          DEFAULT: "var(--color-progress)",
          light: "#E2B85C",
          dark: "#C8962E",
        },
        marigold: {
          DEFAULT: "var(--color-haldi)",
          light: "#E2B85C",
          dark: "#C8962E",
        },
        terracotta: {
          DEFAULT: "var(--color-accent)",
          light: "#D08A6E",
          dark: "#7A3B24",
        },
        // Backwards compatibility with previous motif tokens
        sindoor: {
          DEFAULT: "var(--color-accent)",
          light: "#D08A6E",
          dark: "#7A3B24",
        },
        leaf: {
          DEFAULT: "var(--color-primary)",
          light: "#A3B46A",
          dark: "#5B6B2E",
        },
        turmeric: {
          DEFAULT: "var(--color-haldi)",
          light: "#E2B85C",
          dark: "#C8962E",
        },
        indigo: {
          DEFAULT: "var(--color-primary)",
          light: "#A3B46A",
          dark: "#5B6B2E",
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
