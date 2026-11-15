import React from "react";

interface LedgerBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  hasRedMargin?: boolean;
  stroke?: string;
}

/**
 * Traditional Indian Bahi-Khata Ledger Border
 * Features authentic double-line framing with delicate 45-degree diagonal Kachni hatching
 * and optional traditional crimson/sindoor debit margin line.
 */
export const LedgerBorder: React.FC<LedgerBorderProps> = ({
  children,
  className = "",
  hasRedMargin = false,
  stroke,
  ...props
}) => {
  return (
    <div
      className={`relative p-4 md:p-6 rounded-[3px] border border-border/80 bg-surface shadow-xs transition-colors ${className}`}
      {...props}
    >
      {/* Outer subtle hatching frame SVG */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full stroke-border"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke={stroke}
      >
        {/* Inner parallel inset line (traditional Bahi-Khata double line) */}
        <rect
          x="4.5"
          y="4.5"
          width="calc(100% - 9px)"
          height="calc(100% - 9px)"
          rx="2"
          strokeWidth="1"
          strokeDasharray="4 3"
          strokeOpacity="0.4"
        />

        {/* Four Corner Kachni Hatching Accents */}
        {/* Top Left Corner */}
        <g strokeWidth="1" strokeOpacity="0.5">
          <line x1="8" y1="14" x2="14" y2="8" />
          <line x1="8" y1="18" x2="18" y2="8" />
          <line x1="8" y1="22" x2="22" y2="8" />
        </g>

        {/* Top Right Corner */}
        <g strokeWidth="1" strokeOpacity="0.5">
          <line x1="calc(100% - 14px)" y1="8" x2="calc(100% - 8px)" y2="14" />
          <line x1="calc(100% - 18px)" y1="8" x2="calc(100% - 8px)" y2="18" />
          <line x1="calc(100% - 22px)" y1="8" x2="calc(100% - 8px)" y2="22" />
        </g>

        {/* Bottom Left Corner */}
        <g strokeWidth="1" strokeOpacity="0.5">
          <line x1="8" y1="calc(100% - 14px)" x2="14" y2="calc(100% - 8px)" />
          <line x1="8" y1="calc(100% - 18px)" x2="18" y2="calc(100% - 8px)" />
          <line x1="8" y1="calc(100% - 22px)" x2="22" y2="calc(100% - 8px)" />
        </g>

        {/* Bottom Right Corner */}
        <g strokeWidth="1" strokeOpacity="0.5">
          <line x1="calc(100% - 14px)" y1="calc(100% - 8px)" x2="calc(100% - 8px)" y2="calc(100% - 14px)" />
          <line x1="calc(100% - 18px)" y1="calc(100% - 8px)" x2="calc(100% - 8px)" y2="calc(100% - 18px)" />
          <line x1="calc(100% - 22px)" y1="calc(100% - 8px)" x2="calc(100% - 8px)" y2="calc(100% - 22px)" />
        </g>
      </svg>

      {/* Traditional Left Crimson / Sindoor Ledger Margin Line (if enabled) */}
      {hasRedMargin && (
        <div className="absolute left-6 md:left-8 top-3 bottom-3 w-[1.5px] bg-sindoor/30 pointer-events-none" />
      )}

      {/* Actual Content Container */}
      <div className={`relative z-10 ${hasRedMargin ? "pl-4 md:pl-6" : ""}`}>
        {children}
      </div>
    </div>
  );
};

export default LedgerBorder;
