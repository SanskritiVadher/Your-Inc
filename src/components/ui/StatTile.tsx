"use client";

import React from "react";
import { formatChange } from "@/lib/utils";

interface StatTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  changePercent?: number;
  sparklineData?: number[];
  motif?: React.ReactNode;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  title,
  value,
  subtitle,
  changePercent,
  sparklineData = [],
  motif,
  className = "",
}) => {
  const change = changePercent !== undefined ? formatChange(changePercent) : null;

  // Render SVG Sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const isTrendingUp = sparklineData[sparklineData.length - 1] >= sparklineData[0];

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={isTrendingUp ? "var(--color-leaf)" : "var(--color-sindoor)"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      className={`relative rounded-[3px] border border-border bg-surface p-4 shadow-xs transition-all hover:border-border/80 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-body font-medium text-text-muted">
            {title}
          </p>
          <div className="text-2xl font-semibold font-mono tabular-nums text-text">
            {value}
          </div>
        </div>
        {motif && <div className="text-text-muted opacity-80">{motif}</div>}
      </div>

      <div className="mt-3 flex items-end justify-between pt-2 border-t border-border/40">
        <div className="space-y-0.5">
          {change && (
            <div
              className={`text-xs font-mono font-medium flex items-center tabular-nums ${
                change.isNeutral
                  ? "text-text-muted"
                  : change.isPositive
                  ? "text-leaf dark:text-leaf-dark"
                  : "text-sindoor dark:text-sindoor-dark"
              }`}
            >
              {change.isNeutral ? "• 0.00%" : change.text}
            </div>
          )}
          {subtitle && (
            <p className="text-[11px] text-text-muted leading-tight">{subtitle}</p>
          )}
        </div>

        {renderSparkline()}
      </div>
    </div>
  );
};

export default StatTile;
