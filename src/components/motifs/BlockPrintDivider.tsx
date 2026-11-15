import React from "react";

interface BlockPrintBorderProps {
  className?: string;
}

export const BlockPrintDivider: React.FC<BlockPrintBorderProps> = ({ className = "" }) => {
  return (
    <div className={`w-full overflow-hidden my-3 select-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 600 16"
        className="w-full h-4 text-cobalt opacity-40 dark:opacity-30"
        fill="currentColor"
        preserveAspectRatio="repeat-x"
      >
        <pattern id="bagruMotif" width="30" height="16" patternUnits="userSpaceOnUse">
          {/* Hand-carved Sanganeri floral bud repeat */}
          <circle cx="15" cy="8" r="2.2" />
          <path d="M15 3 C13 5, 13 6, 15 8 C17 6, 17 5, 15 3 Z" />
          <path d="M15 13 C13 11, 13 10, 15 8 C17 10, 17 11, 15 13 Z" />
          <circle cx="5" cy="8" r="1" opacity="0.6" />
          <circle cx="25" cy="8" r="1" opacity="0.6" />
          {/* Small hand-stamped registration dot */}
          <circle cx="15" cy="8.2" r="0.6" fill="#F7F1E5" />
        </pattern>
        <rect width="100%" height="16" fill="url(#bagruMotif)" />
      </svg>
    </div>
  );
};
