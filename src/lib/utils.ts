import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian numbering format / rupees
 */
export function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Format percentage change with direction indicator
 */
export function formatChange(val: number): { text: string; isPositive: boolean; isNeutral: boolean } {
  const isNeutral = Math.abs(val) < 0.001;
  const isPositive = val > 0;
  const prefix = isNeutral ? "" : isPositive ? "▲ +" : "▼ ";
  return {
    text: `${prefix}${val.toFixed(2)}%`,
    isPositive,
    isNeutral,
  };
}
