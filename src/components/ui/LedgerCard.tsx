"use client";

import React from "react";
import { LedgerBorder } from "../motifs/LedgerBorder";
import { CornerOrnament } from "../motifs/CornerOrnament";
import { cn } from "@/lib/utils";

interface LedgerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean;
  hasRedMargin?: boolean;
  withCornerOrnament?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const LedgerCard: React.FC<LedgerCardProps> = ({
  withBorder = false,
  hasRedMargin = false,
  withCornerOrnament = false,
  children,
  className = "",
  ...props
}) => {
  if (withBorder) {
    return (
      <LedgerBorder hasRedMargin={hasRedMargin} className={className} {...props}>
        {withCornerOrnament && <CornerOrnament position="top-right" size={24} />}
        {children}
      </LedgerBorder>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-[3px] border border-border bg-surface p-5 shadow-xs transition-colors",
        hasRedMargin && "pl-8 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-[1.5px] before:bg-sindoor/30",
        className
      )}
      {...props}
    >
      {withCornerOrnament && <CornerOrnament position="top-right" size={24} />}
      {children}
    </div>
  );
};

export default LedgerCard;
