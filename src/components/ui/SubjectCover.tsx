import React from "react";
import { SubjectCoverArtSlot } from "@/components/art/SubjectCoverArtSlot";

export interface SubjectCoverProps {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  sharePrice?: number;
  changePercent?: number;
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
  onClick,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-44 h-64 p-3",
    md: "w-56 h-76 p-4",
    lg: "w-64 h-88 p-5",
  }[size];

  return (
    <div
      key={id}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-lg border border-border/80 bg-surface hover:border-cobalt/40 hover:shadow-xs transition-all p-4 flex flex-col justify-between font-body text-left ${sizeClasses} ${className}`}
    >
      <div className="space-y-3">
        {/* Top: Art Slot & Subject Code */}
        <SubjectCoverArtSlot subjectCode={code} className="h-24 w-full" />

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium text-cobalt">{code || "Subject"}</span>
            <span>{credits} credits</span>
          </div>
          <h3 className="font-heading text-base font-normal text-text line-clamp-2">
            {name}
          </h3>
        </div>
      </div>

      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-muted">
        <span>Mastery: {Math.round(sharePrice)}%</span>
        {changePercent !== 0 && (
          <span className={changePercent > 0 ? "text-leaf" : "text-sindoor"}>
            {changePercent > 0 ? `+${Math.round(changePercent)}%` : `${Math.round(changePercent)}%`}
          </span>
        )}
      </div>
    </div>
  );
};

export default SubjectCover;
