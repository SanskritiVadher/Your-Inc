import React from "react";
import { SubjectCoverArtSlot } from "@/components/art/SubjectCoverArtSlot";
import { Upload } from "lucide-react";

export interface SubjectCoverProps {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  sharePrice?: number;
  changePercent?: number;
  deckCount?: number;
  cardsCount?: number;
  mastery?: number;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const SubjectCover: React.FC<SubjectCoverProps> = ({
  id,
  name,
  code,
  credits = 3,
  sharePrice = 0.0,
  changePercent = 0.0,
  deckCount = 0,
  cardsCount = 0,
  mastery,
  onClick,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-44 h-64 p-3",
    md: "w-56 h-76 p-4",
    lg: "w-64 h-88 p-5",
  }[size];

  // Derive mastery value if not provided directly
  const displayMastery = mastery !== undefined ? mastery : Math.round(sharePrice);

  return (
    <div
      key={id}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-lg border border-text/10 bg-surface hover:border-primary/40 hover:shadow-xs transition-all p-4 flex flex-col justify-between font-body text-left cursor-pointer ${sizeClasses} ${className}`}
    >
      <div className="space-y-3">
        {/* Top: Art Slot */}
        <SubjectCoverArtSlot subjectCode={code} className="h-24 w-full" />

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{credits} credits</span>
            {deckCount > 0 && (
              <span>{deckCount} {deckCount === 1 ? "deck" : "decks"}</span>
            )}
          </div>
          <h3 className="font-heading text-base font-normal text-text line-clamp-2">
            {name}
          </h3>
        </div>
      </div>

      <div className="pt-3 border-t border-text/10 flex items-center justify-between text-xs text-text-muted">
        {deckCount === 0 ? (
          <span className="text-primary hover:underline flex items-center gap-1 font-medium">
            <span>No decks yet · Upload</span>
          </span>
        ) : cardsCount > 0 ? (
          <span>Mastery: {displayMastery}%</span>
        ) : (
          <span>{deckCount} {deckCount === 1 ? "deck" : "decks"} · 0 cards</span>
        )}

        {cardsCount > 0 && changePercent !== 0 && (
          <span className={changePercent > 0 ? "text-primary" : "text-accent"}>
            {changePercent > 0 ? `+${Math.round(changePercent)}%` : `${Math.round(changePercent)}%`}
          </span>
        )}
      </div>
    </div>
  );
};

export default SubjectCover;
