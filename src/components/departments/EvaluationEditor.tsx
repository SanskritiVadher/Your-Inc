"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface EvaluationItem {
  id?: string;
  name: string;
  weight: number;
}

interface EvaluationEditorProps {
  subjectId: string;
  initialComponents: EvaluationItem[];
  onSaveSuccess?: () => void;
}

export const EvaluationEditor: React.FC<EvaluationEditorProps> = ({
  subjectId,
  initialComponents,
  onSaveSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const [components, setComponents] = useState<EvaluationItem[]>(
    initialComponents.length > 0
      ? initialComponents
      : [
          { name: "Midterm Examination", weight: 30 },
          { name: "Group Case Project", weight: 25 },
          { name: "Quizzes", weight: 15 },
          { name: "Class Participation", weight: 10 },
          { name: "End-Term Examination", weight: 20 },
        ]
  );
  const [saving, setSaving] = useState(false);

  const totalWeight = Math.round(components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) * 10) / 10;
  const isValid = Math.abs(totalWeight - 100) < 0.1;

  const handleWeightChange = (index: number, val: number) => {
    const updated = [...components];
    updated[index].weight = val;
    setComponents(updated);
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...components];
    updated[index].name = name;
    setComponents(updated);
  };

  const handleAdd = () => {
    setComponents([...components, { name: "New Assessment", weight: 10 }]);
  };

  const handleRemove = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!isValid) {
      toastError(`Weights must total exactly 100%. Currently at ${totalWeight}%.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/evaluation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save evaluation scheme");
      }

      success("Evaluation Scheme Saved", "Grading breakdown committed at exactly 100%");
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[3px] border border-border bg-surface p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border gap-2">
        <div>
          <h3 className="font-heading text-lg text-text">Syllabus Evaluation Scheme</h3>
          <p className="text-xs text-text-muted font-body">
            Configure course components. Total syllabus weight must balance to exactly 100%.
          </p>
        </div>

        {/* Sum Indicator Pill */}
        <div
          className={`inline-flex items-center space-x-2 px-3 py-1 rounded-[2px] border text-xs font-mono font-semibold ${
            isValid
              ? "border-leaf/60 bg-leaf/10 text-leaf"
              : "border-sindoor/60 bg-sindoor/10 text-sindoor"
          }`}
        >
          {isValid ? (
            <CheckCircle2 size={14} className="shrink-0" />
          ) : (
            <AlertCircle size={14} className="shrink-0" />
          )}
          <span>Total: {totalWeight}% / 100%</span>
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-2.5">
        {components.map((comp, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-3 p-2.5 rounded-[2px] border border-border/80 bg-bg/50"
          >
            <input
              type="text"
              value={comp.name}
              onChange={(e) => handleNameChange(idx, e.target.value)}
              placeholder="e.g. Midterm Case Analysis"
              className="flex-1 rounded-[2px] border border-border/70 bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:border-sindoor"
            />
            <div className="flex items-center space-x-1.5 w-28 shrink-0">
              <input
                type="number"
                min="1"
                max="100"
                value={comp.weight}
                onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                className="w-16 rounded-[2px] border border-border/70 bg-surface px-2.5 py-1.5 text-xs text-right font-mono tabular-nums text-text focus:outline-none focus:border-sindoor"
              />
              <span className="font-mono text-xs text-text-muted">%</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              title="Remove component"
              className="p-1.5 text-text-muted hover:text-sindoor rounded transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[2px] border border-border text-xs font-mono uppercase tracking-wider text-text hover:bg-bg transition-colors"
        >
          <Plus size={14} />
          <span>Add Component</span>
        </button>

        <button
          type="button"
          disabled={!isValid || saving}
          onClick={handleSave}
          title={!isValid ? "Weights must total exactly 100% to save" : "Save Scheme"}
          className="inline-flex items-center space-x-2 px-5 py-2 rounded-[2px] bg-sindoor text-white text-xs font-mono uppercase tracking-wider font-semibold shadow-xs hover:bg-sindoor/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          <span>{saving ? "Saving Scheme..." : "Save Evaluation Scheme"}</span>
        </button>
      </div>
    </div>
  );
};

export default EvaluationEditor;
