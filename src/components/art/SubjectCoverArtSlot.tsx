"use client";

import React, { useState } from "react";

interface SubjectCoverArtSlotProps {
  subjectCode?: string;
  imageSrc?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Subject Cover Art Slot:
 * Reserved slot for commissioned artwork in /public/art/subjects/[code].png.
 * Shows a calm plain paper texture until custom artwork is provided.
 */
export const SubjectCoverArtSlot: React.FC<SubjectCoverArtSlotProps> = ({
  subjectCode,
  imageSrc,
  alt = "Subject Cover Artwork",
  className = "",
  children,
}) => {
  const defaultPath = subjectCode ? `/art/subjects/${subjectCode.toLowerCase()}.png` : "/art/subject-cover.png";
  const targetSrc = imageSrc || defaultPath;
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border/50 bg-paper/70 transition-all ${className}`}
    >
      {!hasError && targetSrc ? (
        <div className="relative w-full h-full min-h-[120px] flex items-center justify-center">
          <img
            src={targetSrc}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
          {children && (
            <div className="absolute inset-0 bg-black/20 p-4 flex flex-col justify-end text-white">
              {children}
            </div>
          )}
        </div>
      ) : (
        /* Calm plain paper texture fallback */
        <div className="w-full min-h-[110px] p-4 flex flex-col justify-between bg-paper/50">
          <div className="w-8 h-0.5 bg-border/50 rounded-full" />
          {children ? (
            <div>{children}</div>
          ) : (
            <span className="text-[11px] text-text-muted/60 font-body">
              {subjectCode || "Subject Cover"}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectCoverArtSlot;
