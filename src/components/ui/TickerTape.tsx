"use client";

import React, { useState } from "react";
import { formatINR, formatChange } from "@/lib/utils";

export interface TickerItem {
  id: string;
  name: string;
  code: string;
  sharePrice: number;
  changePercent: number;
}

interface TickerTapeProps {
  items: TickerItem[];
  className?: string;
}

export const TickerTape: React.FC<TickerTapeProps> = ({ items, className = "" }) => {
  const [isPaused, setIsPaused] = useState(false);

  // If no items, show default You Inc. aggregate index
  const displayItems = items.length > 0 ? items : [
    { id: "idx-you", name: "You Inc. Index", code: "YOU", sharePrice: 0.0, changePercent: 0.0 }
  ];

  // Duplicate items to ensure smooth continuous marquee loop
  const repeated = [...displayItems, ...displayItems, ...displayItems, ...displayItems];

  return (
    <div
      role="region"
      aria-label="Department Share Price Ticker"
      className={`relative w-full overflow-hidden border-b border-border bg-surface/90 py-1.5 font-mono text-xs select-none backdrop-blur-xs ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Subtle left and right gradient fades to feel like continuous ledger parchment */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg to-transparent z-10" />

      <div
        className={`flex w-max space-x-8 items-center ${
          isPaused ? "animation-play-state-paused" : "animate-ticker"
        }`}
        style={{
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {repeated.map((item, idx) => {
          const isPositive = (item.changePercent || 0) > 0;
          const isNegative = (item.changePercent || 0) < 0;
          const delta = Math.abs(Math.round(item.changePercent || 0));
          const changeBadge = isPositive ? `▲${delta || 1}` : isNegative ? `▼${delta || 1}` : "";

          return (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-[2px] transition-colors hover:bg-bg/60"
            >
              <span className="font-semibold text-text tracking-wide">
                {item.name || item.code} {Math.round(item.sharePrice || 0)}%
              </span>
              {changeBadge && (
                <span
                  className={`tabular-nums font-semibold text-[11px] ${
                    isPositive ? "text-leaf dark:text-leaf-dark" : "text-sindoor dark:text-sindoor-dark"
                  }`}
                >
                  {changeBadge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TickerTape;
