"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileArchive, CheckCircle2, ArrowRight, Loader2, Layers } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface DeckUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  onUploadSuccess?: (deckId: string) => void;
}

export const DeckUploadModal: React.FC<DeckUploadModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onUploadSuccess,
}) => {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [sessionNumber, setSessionNumber] = useState<number | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<"parsing" | "understanding" | "generating" | "done">("parsing");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);

      // Heuristic extraction for session number from file name
      const match = selected.name.match(/(?:session|lecture|class|module|week)\s*(\d+)/i);
      if (match) {
        setSessionNumber(parseInt(match[1], 10));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toastError("Please select a .pptx, .pdf, or .zip presentation deck");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setProgressStatus("parsing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (subjectId) formData.append("subjectId", subjectId);
      if (sessionNumber) formData.append("sessionNumber", String(sessionNumber));

      const res = await fetch("/api/decks/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.duplicate) {
        info("Re-uploaded deck detected", "Showing existing deck instead of duplicating.");
        onClose();
        router.push(`/decks/${data.deck.id}`);
        return;
      }

      setUploadProgress(65);
      setProgressStatus("understanding");

      // Auto-trigger generation pipeline for the uploaded deck
      const primaryDeckId = data.primaryDeckId;
      setProgressStatus("generating");
      setUploadProgress(85);

      const genRes = await fetch(`/api/decks/${primaryDeckId}/generate`, {
        method: "POST",
      });

      if (genRes.ok) {
        setUploadProgress(100);
        setProgressStatus("done");
        success("Ready for Review", "Reading your slides complete. Key ideas connected & review cards ready.");
        onClose();
        if (onUploadSuccess) onUploadSuccess(primaryDeckId);
        router.push(`/decks/${primaryDeckId}`);
      } else {
        onClose();
        router.push(`/decks/${primaryDeckId}`);
      }
    } catch (err: unknown) {
      toastError("Something went wrong. Try again.");
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Upload Lecture Session Deck"
      description="Turn your class slides into an active recall study system (.pptx, .pdf, or .zip, max 50 MB)"
      className="max-w-lg"
    >
      <div className="space-y-5 font-body text-xs">
        {/* File Drop Area */}
        <div className="rounded-[3px] border-2 border-dashed border-border p-6 text-center bg-bg/40 hover:bg-bg/60 transition-colors">
          <Upload size={32} className="mx-auto text-text-muted mb-2" />
          <p className="font-mono text-xs text-text font-semibold">
            {file ? file.name : "Drag and drop or select presentation deck"}
          </p>
          <p className="text-[11px] font-mono text-text-muted mt-1">
            Accepts PowerPoint (.pptx), PDF (.pdf), or ZIP archive of multiple decks
          </p>
          <input
            type="file"
            accept=".pptx,.pdf,.zip"
            onChange={handleFileChange}
            disabled={isUploading}
            className="mt-3 block mx-auto text-xs font-mono text-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-[2px] file:border file:border-border file:text-xs file:font-mono file:bg-surface file:text-text hover:file:bg-bg"
          />
        </div>

        {/* Subject & Session Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Department *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isUploading}
              className="w-full rounded-[2px] border border-border bg-bg p-2 font-mono text-xs text-text focus:outline-none focus:border-sindoor"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono uppercase tracking-wider text-text-muted mb-1">
              Session Number
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 4"
              disabled={isUploading}
              className="w-full rounded-[2px] border border-border bg-bg p-2 font-mono text-xs text-text focus:outline-none focus:border-sindoor"
            />
          </div>
        </div>

        {/* Progress bar and fanning slide cards during background processing */}
        {isUploading && (
          <div className="space-y-4 p-4 rounded-[3px] border border-border bg-surface">
            {/* Animated Cards Fanning Out */}
            <div className="relative h-24 w-full flex items-center justify-center overflow-hidden">
              {[-16, -8, 0, 8, 16].map((deg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: 20, rotate: 0, opacity: 0 }}
                  animate={{
                    y: 0,
                    rotate: deg,
                    x: deg * 3.5,
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.08,
                    ease: "easeOut",
                  }}
                  className="absolute w-20 h-16 rounded-[2px] border border-border bg-paper shadow-sm p-1.5 flex flex-col justify-between select-none"
                  style={{
                    transformOrigin: "bottom center",
                  }}
                >
                  <div className="flex items-center justify-between font-mono text-[7px] text-text-muted">
                    <span>SLIDE #{idx + 1}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-turmeric" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="w-12 h-1 bg-border rounded-xs" />
                    <div className="w-8 h-1 bg-border/60 rounded-xs" />
                  </div>
                  <div className="font-mono text-[6px] text-sindoor font-bold">
                    EXTRACTED
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text font-semibold flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin text-sindoor" />
                {progressStatus === "parsing"
                  ? "Reading your slides, tables & notes..."
                  : progressStatus === "understanding"
                  ? "Connecting ideas & key concepts..."
                  : progressStatus === "generating"
                  ? "Preparing your review cards & key takeaways..."
                  : "Preparing your study material..."}
              </span>
              <span className="tabular-nums text-text-muted">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-sindoor transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-text-muted text-center">
              Organizing slides into review cards for your subject.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-3 py-1.5 font-mono text-xs text-text-muted hover:text-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-[2px] bg-sindoor text-white font-mono text-xs uppercase tracking-wider font-semibold shadow-xs hover:bg-sindoor/90 transition-all disabled:opacity-40"
          >
            <Upload size={14} />
            <span>{isUploading ? "Preparing your study material..." : "Upload & Study Deck"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeckUploadModal;
