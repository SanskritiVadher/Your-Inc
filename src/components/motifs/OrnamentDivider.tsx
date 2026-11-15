import React from "react";

interface OrnamentDividerProps extends React.SVGProps<SVGSVGElement> {
  width?: number | string;
  className?: string;
}

/**
 * Madhubani Kachni-style Ledger Divider Ornament
 * Traditional Mithila horizontal flourish for separating ledger entries and balance items.
 */
export const OrnamentDivider: React.FC<OrnamentDividerProps> = ({
  width = "100%",
  className = "",
  ...props
}) => {
  return (
    <svg
      width={width}
      height="18"
      viewBox="0 0 300 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mx-auto opacity-70 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left ruling line */}
      <line x1="10" y1="9" x2="115" y2="9" />
      <line x1="25" y1="6" x2="110" y2="6" strokeDasharray="3 3" opacity="0.6" />

      {/* Center Traditional Floral Knot */}
      <circle cx="150" cy="9" r="4" />
      <circle cx="150" cy="9" r="1.5" fill="currentColor" />

      {/* Left petal loop */}
      <path d="M 146 9 C 141 4, 133 4, 131 9 C 133 14, 141 14, 146 9 Z" />
      <line x1="135" y1="9" x2="142" y2="9" />

      {/* Right petal loop */}
      <path d="M 154 9 C 159 4, 167 4, 169 9 C 167 14, 159 14, 154 9 Z" />
      <line x1="158" y1="9" x2="165" y2="9" />

      {/* Upper and lower central bud accents */}
      <path d="M 150 5 L 150 1" />
      <circle cx="150" cy="1" r="0.8" fill="currentColor" />
      <path d="M 150 13 L 150 17" />
      <circle cx="150" cy="17" r="0.8" fill="currentColor" />

      {/* Right ruling line */}
      <line x1="185" y1="9" x2="290" y2="9" />
      <line x1="190" y1="6" x2="275" y2="6" strokeDasharray="3 3" opacity="0.6" />
    </svg>
  );
};

export default OrnamentDivider;
