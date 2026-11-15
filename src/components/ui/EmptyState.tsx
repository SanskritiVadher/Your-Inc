"use client";

import React from "react";
import Link from "next/link";
import { EmptyStateArtSlot } from "@/components/art/EmptyStateArtSlot";
import { OrnamentDivider } from "../motifs/OrnamentDivider";

interface EmptyStateProps {
  motif?: React.ReactNode;
  illustrationType?: "peacock" | "tree" | "fish" | "slot";
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  motif,
  illustrationType = "slot",
  title,
  message,
  actionText,
  actionHref,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`rounded-lg border border-dashed border-border/80 p-8 md:p-12 text-center bg-surface/50 flex flex-col items-center justify-center space-y-4 font-body ${className}`}
    >
      <div className="transition-transform duration-300 drop-shadow-xs">
        {motif || <EmptyStateArtSlot name={illustrationType} />}
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="font-heading text-xl text-text font-normal">{title}</h3>
        <p className="text-xs text-text-muted leading-relaxed font-body">
          {message}
        </p>
      </div>

      <OrnamentDivider className="w-36 opacity-30" />

      {actionText && (actionHref ? (
        <Link
          href={actionHref}
          className="mt-1 inline-flex items-center px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-body text-xs font-medium shadow-2xs hover:bg-cobalt/90 transition-colors whitespace-nowrap"
        >
          {actionText}
        </Link>
      ) : onAction ? (
        <button
          onClick={onAction}
          type="button"
          className="mt-1 inline-flex items-center px-4 py-2 rounded bg-cobalt text-white dark:text-[#1A1714] font-body text-xs font-medium shadow-2xs hover:bg-cobalt/90 transition-colors whitespace-nowrap"
        >
          {actionText}
        </button>
      ) : null)}
    </div>
  );
};

export default EmptyState;
