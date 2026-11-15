"use client";

import React, { useState } from "react";
import Image from "next/image";

interface HeroArtSlotProps {
  imageSrc?: string;
  alt?: string;
  className?: string;
}

/**
 * Hero Art Slot:
 * Reserved slot for commissioned artwork in /public/art/hero.png.
 * Shows a calm plain paper texture until custom artwork is provided.
 */
export const HeroArtSlot: React.FC<HeroArtSlotProps> = ({
  imageSrc = "/art/hero.png",
  alt = "Course Hero Artwork",
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-border/40 bg-paper/60 transition-all ${className}`}
    >
      {!hasError && imageSrc ? (
        <div className="relative w-full min-h-[140px] flex items-center justify-center">
          {/* Attempt to load image from /public/art */}
          <img
            src={imageSrc}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-auto object-cover max-h-[220px]"
          />
        </div>
      ) : (
        /* Calm plain paper texture fallback */
        <div className="w-full min-h-[100px] p-6 flex flex-col items-center justify-center bg-paper/40 text-center">
          <div className="w-12 h-0.5 bg-border/60 rounded-full mb-2" />
          <span className="text-xs text-text-muted/60 font-body">
            Plain Paper Surface
          </span>
        </div>
      )}
    </div>
  );
};

export default HeroArtSlot;
