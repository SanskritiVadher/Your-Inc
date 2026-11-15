"use client";

import React, { useState, useEffect } from "react";
import { Info, Calendar, TrendingUp, TrendingDown, HelpCircle, X } from "lucide-react";

export interface CandlestickPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  eventsCount: number;
}

interface SharePriceCalculation {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sharePrice: number;
  conceptMasteryWeight70: number;
  assignmentScoreWeight30: number;
  totalConcepts: number;
  totalAssignments: number;
  breakdown: {
    formula: string;
    conceptScore: number;
    assignmentScore: number;
    explanation: string;
  };
}

interface CandlestickChartProps {
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  subjectId,
  subjectCode = "DEPT",
  subjectName = "Department",
}) => {
  const [range, setRange] = useState<"7D" | "30D" | "TERM">("30D");
  const [candlesticks, setCandlesticks] = useState<CandlestickPoint[]>([]);
  const [calculation, setCalculation] = useState<SharePriceCalculation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickPoint | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/economy/share-price?subjectId=${subjectId}&range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.candlesticks) setCandlesticks(data.candlesticks);
        if (data.calculation) setCalculation(data.calculation);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load candlesticks:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subjectId, range]);

  // Compute SVG coordinates for the candlesticks
  const minVal = Math.max(0, Math.min(...candlesticks.map((c) => c.low), 30) - 5);
  const maxVal = Math.min(100, Math.max(...candlesticks.map((c) => c.high), 80) + 5);
  const valueRange = maxVal - minVal || 1;

  const svgHeight = 240;
  const svgWidth = 600;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return paddingTop + (1 - (clamped - minVal) / valueRange) * chartHeight;
  };

  const candleCount = candlesticks.length;
  const candleSlotWidth = candleCount > 0 ? chartWidth / candleCount : chartWidth;
  const candleBodyWidth = Math.max(3, Math.min(16, candleSlotWidth * 0.65));

  return (
    <div className="bg-surface/90 border border-border rounded-lg p-5 font-body relative overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-turmeric/20 text-turmeric uppercase tracking-wider">
              Ledger Valuation Chart
            </span>
            <span className="font-mono text-xs text-text-muted">{subjectCode} · {subjectName}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-heading text-3xl text-text">
              ₹{(calculation?.sharePrice || (candlesticks[candlesticks.length - 1]?.close ?? 50.0)).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-text-muted">book share price</span>
          </div>
        </div>

        {/* Range selectors */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-border bg-bg/80 p-0.5">
            {(["7D", "30D", "TERM"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  range === r
                    ? "bg-surface font-bold text-text shadow-xs border border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative w-full overflow-x-auto">
        {loading ? (
          <div className="h-[240px] flex items-center justify-center font-mono text-xs text-text-muted">
            <div className="animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-turmeric animate-ping" />
              Auditing ledger transaction candles...
            </div>
          </div>
        ) : candlesticks.length === 0 ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-center p-4">
            <p className="font-heading text-base text-text">No ledger entries for this period</p>
            <p className="font-body text-xs text-text-muted max-w-sm mt-1">
              Share prices fluctuate only upon verified recall repetitions and assignment grades.
            </p>
          </div>
        ) : (
          <div className="relative min-w-[500px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[240px] select-none"
              style={{ overflow: "visible" }}
            >
              {/* Grid Lines */}
              {[minVal, minVal + valueRange * 0.33, minVal + valueRange * 0.66, maxVal].map((gridVal, i) => {
                const y = getY(gridVal);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-border/40"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <text
                      x={paddingLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-text-muted"
                    >
                      ₹{gridVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Threshold line at 80 (IPO target) */}
              {80 >= minVal && 80 <= maxVal && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={getY(80)}
                    x2={svgWidth - paddingRight}
                    y2={getY(80)}
                    stroke="var(--color-turmeric)"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                    opacity={0.7}
                  />
                  <text
                    x={svgWidth - paddingRight}
                    y={getY(80) - 4}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-turmeric font-bold"
                  >
                    IPO Benchmark (₹80.00)
                  </text>
                </g>
              )}

              {/* Candlesticks */}
              {candlesticks.map((candle, idx) => {
                const slotX = paddingLeft + idx * candleSlotWidth;
                const candleCenterX = slotX + candleSlotWidth / 2;
                const isBullish = candle.close >= candle.open;
                const candleColor = isBullish ? "var(--color-leaf)" : "var(--color-sindoor)";

                const highY = getY(candle.high);
                const lowY = getY(candle.low);
                const openY = getY(candle.open);
                const closeY = getY(candle.close);

                const bodyTopY = Math.min(openY, closeY);
                const bodyHeight = Math.max(2, Math.abs(openY - closeY));
                const bodyLeftX = candleCenterX - candleBodyWidth / 2;

                return (
                  <g
                    key={candle.date}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredCandle(candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                  >
                    {/* Hover Hit Box */}
                    <rect
                      x={slotX}
                      y={paddingTop}
                      width={candleSlotWidth}
                      height={chartHeight}
                      fill="transparent"
                      className="hover:fill-surface/40 transition-colors"
                    />

                    {/* Wick Line */}
                    <line
                      x1={candleCenterX}
                      y1={highY}
                      x2={candleCenterX}
                      y2={lowY}
                      stroke={candleColor}
                      strokeWidth={1.5}
                    />

                    {/* Candle Body */}
                    <rect
                      x={bodyLeftX}
                      y={bodyTopY}
                      width={candleBodyWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      rx={1}
                      stroke={candleColor}
                      strokeWidth={1}
                    />
                  </g>
                );
              })}

              {/* X-axis date labels (show every few dates) */}
              {candlesticks.map((candle, idx) => {
                const interval = Math.ceil(candleCount / 6);
                if (idx % interval !== 0 && idx !== candleCount - 1) return null;
                const slotX = paddingLeft + idx * candleSlotWidth + candleSlotWidth / 2;
                const dateStr = candle.date.slice(5); // MM-DD
                return (
                  <text
                    key={`label-${candle.date}`}
                    x={slotX}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-text-muted"
                  >
                    {dateStr}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredCandle && (
              <div className="absolute top-2 left-14 bg-surface border border-border shadow-md rounded p-2 text-xs font-mono pointer-events-none z-10 flex gap-3 text-text">
                <div>
                  <span className="text-text-muted">Date:</span> {hoveredCandle.date}
                </div>
                <div>
                  <span className="text-text-muted">O:</span> ₹{hoveredCandle.open.toFixed(1)}
                </div>
                <div>
                  <span className="text-text-muted">H:</span> ₹{hoveredCandle.high.toFixed(1)}
                </div>
                <div>
                  <span className="text-text-muted">L:</span> ₹{hoveredCandle.low.toFixed(1)}
                </div>
                <div>
                  <span className="text-text-muted">C:</span>{" "}
                  <span
                    className={
                      hoveredCandle.close >= hoveredCandle.open ? "text-leaf font-bold" : "text-sindoor font-bold"
                    }
                  >
                    ₹{hoveredCandle.close.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Events:</span> {hoveredCandle.eventsCount}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-3 pt-3 border-t border-border/70 flex flex-wrap items-center justify-between text-xs font-mono text-text-muted gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-leaf inline-block" />
            <span>Net Value Expansion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sindoor inline-block" />
            <span>Depreciation Decay</span>
          </div>
        </div>
        <div className="text-[11px]">
          70% Review Weight + 30% Assignment Weight · 0% Screen Time
        </div>
      </div>
    </div>
  );
};
