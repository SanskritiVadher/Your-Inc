import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", ...props }) => {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-[2px] bg-border/40 transition-colors",
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
