"use client";

import React from "react";

interface CornerOrnamentProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Authentic Madhubani (Mithila) Corner Hatching Ornament
 * Designed for key cards only (Hero cards, review prompts, milestone tiles).
 * Features authentic 45-degree Kachni hatching with traditional Mithila dot buds.
 */
export const CornerOrnament: React.FC<CornerOrnamentProps> = ({
  position = "top-right",
  size = 28,
  className = "",
  color = "#7A3B24",
}) => {
  const rotation = {
    "top-right": "",
    "bottom-right": "rotate-90",
    "bottom-left": "rotate-180",
    "top-left": "-rotate-90",
  }[position];

  const posClass = {
    "top-right": "top-1 right-1",
    "bottom-right": "bottom-1 right-1",
    "bottom-left": "bottom-1 left-1",
    "top-left": "top-1 left-1",
  }[position];

  return (
    <div
      className={`absolute ${posClass} pointer-events-none select-none ${rotation} ${className}`}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer corner frame */}
        <path d="M 4 24 L 24 24 L 24 4" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
        {/* Kachni diagonal hatching */}
        <line x1="8" y1="24" x2="24" y2="8" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="13" y1="24" x2="24" y2="13" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="18" y1="24" x2="24" y2="18" stroke={color} strokeWidth="0.8" strokeOpacity="0.6" />
        {/* Sacred bud dots */}
        <circle cx="24" cy="4" r="1.5" fill="#EAA82C" />
        <circle cx="4" cy="24" r="1.5" fill="#EAA82C" />
      </svg>
    </div>
  );
};

export default CornerOrnament;
