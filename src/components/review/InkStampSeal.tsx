"use client";

import React from "react";
import { motion } from "framer-motion";

interface InkStampSealProps {
  label?: string;
  grade?: number;
  delta?: number;
  className?: string;
}

/**
 * Authentic Indian Bahi-Khata ink-stamp seal.
 * Settles softly onto correct answers with a tactile ink imprint.
 */
export const InkStampSeal: React.FC<InkStampSealProps> = ({
  label = "स्मृति दृढ़ • VERIFIED RECALL",
  grade = 3,
  delta = 1.0,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ scale: 1.35, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: -3, opacity: 0.88 }}
      transition={{ duration: 0.42, ease: [0.175, 0.885, 0.32, 1.275] }}
      className={`pointer-events-none select-none inline-flex flex-col items-center justify-center p-3 rounded-full border-2 border-dashed border-leaf text-leaf bg-leaf/5 ${className}`}
      style={{
        maskImage: "radial-gradient(circle, rgba(0,0,0,1) 75%, rgba(0,0,0,0.8) 100%)",
      }}
    >
      <div className="w-20 h-20 rounded-full border border-leaf/60 flex flex-col items-center justify-center text-center p-1">
        <span className="font-body text-[8px] text-leaf/80 block">
          You Inc.
        </span>
        <span className="font-heading text-xs font-medium text-leaf leading-tight block mt-0.5">
          {grade >= 4 ? "Mastered" : "Strengthened"}
        </span>
        <span className="font-mono text-[8px] font-bold text-leaf/90 block mt-0.5">
          +{delta.toFixed(1)} pts
        </span>
        <span className="font-body text-[7px] text-leaf/70 block mt-0.5">
          Review complete
        </span>
      </div>
    </motion.div>
  );
};

export default InkStampSeal;
