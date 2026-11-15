"use client";

import React, { useState } from "react";

interface EmptyStateArtSlotProps {
  name?: string;
  imageSrc?: string;
  alt?: string;
  className?: string;
}

/**
 * Empty State Art Slot:
 * Reserved slot for commissioned artwork in /public/art/empty-state.png.
 * Shows a calm plain paper texture until custom artwork is provided.
 */
export const EmptyStateArtSlot: React.FC<EmptyStateArtSlotProps> = ({
  name = "empty",
  imageSrc,
  alt = "Empty State Artwork",
  className = "",
}) => {
  const defaultPath = `/art/empty-${name}.png`;
  const targetSrc = imageSrc || defaultPath;
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`mx-auto overflow-hidden rounded-md border border-border/40 bg-paper/60 transition-all ${className}`}
    >
      {!hasError && targetSrc ? (
        <div className="relative w-full h-full min-h-[90px] flex items-center justify-center">
          <img
            src={targetSrc}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-auto object-contain max-h-[140px]"
          />
        </div>
      ) : (
        /* Calm plain paper texture fallback */
        <div className="w-20 h-20 mx-auto rounded-md border border-border/50 bg-paper/50 flex items-center justify-center">
          <div className="w-6 h-0.5 bg-border/60 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default EmptyStateArtSlot;
