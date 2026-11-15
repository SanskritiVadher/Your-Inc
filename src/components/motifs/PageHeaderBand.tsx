"use client";

import React from "react";

interface PageHeaderBandProps {
  className?: string;
}

/**
 * Simple geometric block-print header band.
 * Minimal ruling lines and repeating geometric diamond points.
 */
export const PageHeaderBand: React.FC<PageHeaderBandProps> = ({ className = "" }) => {
  return (
    <div className={`w-full overflow-hidden my-3 select-none pointer-events-none opacity-50 ${className}`} aria-hidden="true">
      <svg
        className="w-full h-3 text-cobalt"
        viewBox="0 0 600 12"
        preserveAspectRatio="repeat-x"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <pattern id="headerGeometricPattern" width="24" height="12" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
          <polygon points="12,4 15,6 12,8 9,6" opacity="0.6" />
          <circle cx="12" cy="6" r="0.8" fill="currentColor" />
          <circle cx="0" cy="6" r="0.6" opacity="0.4" />
          <circle cx="24" cy="6" r="0.6" opacity="0.4" />
          <line x1="0" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
        </pattern>
        <rect width="100%" height="12" fill="url(#headerGeometricPattern)" />
      </svg>
    </div>
  );
};

export default PageHeaderBand;
