"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  MapPin,
  Check,
  X,
  Lock,
  EyeOff,
  Clock,
  Compass,
} from "lucide-react";

export interface PermissionSettings {
  masterEnabled: boolean;
  focusMapEnabled: boolean;
  studyZoneRemindersEnabled: boolean;
  fieldCasesEnabled: boolean;
}

interface PermissionModalProps {
  isOpen: boolean;
  currentPermissions: PermissionSettings;
  onSave: (updated: PermissionSettings) => void;
  onDismiss: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  currentPermissions,
  onSave,
  onDismiss,
}) => {
  const [perms, setPerms] = useState<PermissionSettings>(currentPermissions);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PermissionSettings) => {
    setPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEnableAll = () => {
    const allEnabled: PermissionSettings = {
      masterEnabled: true,
      focusMapEnabled: true,
      studyZoneRemindersEnabled: true,
      fieldCasesEnabled: true,
    };
    setPerms(allEnabled);
    onSave(allEnabled);
  };

  const handleSaveCustom = () => {
    const hasAny = perms.focusMapEnabled || perms.studyZoneRemindersEnabled || perms.fieldCasesEnabled;
    const finalPerms = { ...perms, masterEnabled: hasAny };
    onSave(finalPerms);
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-turmeric rounded-xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative font-body space-y-4 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 text-text-muted hover:text-text"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Privacy Guarantee */}
        <div className="space-y-1 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded bg-turmeric/20 text-turmeric">
              Privacy Protocol
            </span>
            <span className="text-xs font-mono text-leaf flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3" />
              Strictly Opt-In
            </span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl text-text font-bold">
            Location Features &amp; Data Charter
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            In You Inc., location features are completely optional. The full application and degree ledger remain 100% operational with location turned off.
          </p>
        </div>

        {/* Clear Explanation: What is collected, Why, Retention */}
        <div className="p-3.5 rounded bg-bg border border-border text-xs font-mono space-y-2">
          <div className="flex items-start gap-2">
            <EyeOff className="w-4 h-4 text-turmeric shrink-0 mt-0.5" />
            <div>
              <strong className="text-text block">Coarse Coordinates (~100m):</strong>
              <span className="text-text-muted text-[11px] leading-snug">
                Coordinates are rounded to 3 decimal places (~110m) for Focus Maps and Field Cases. No background tracking is performed.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-text block">90-Day Auto-Purge:</strong>
              <span className="text-text-muted text-[11px] leading-snug">
                Study session location history is automatically purged after 90 days.
              </span>
            </div>
          </div>
        </div>

        {/* Granular Toggles */}
        <div className="space-y-2.5 pt-1">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-text block">
            Granular Feature Permissions:
          </span>

          {[
            {
              key: "focusMapEnabled" as const,
              title: "Focus Map Activity",
              desc: "Tag study sessions to saved places (Library, Hostel) to identify high-retention study zones.",
            },
            {
              key: "studyZoneRemindersEnabled" as const,
              title: "Study-Zone In-App Triggers",
              desc: "Remind you of cards waiting for review when opening the app inside a saved study place (no background tracking).",
            },
            {
              key: "fieldCasesEnabled" as const,
              title: "Real-World Field Cases",
              desc: "Read nearby OpenStreetMap businesses to generate grounded 5-minute micro-cases.",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="p-3 rounded bg-bg border border-border/80 flex items-start justify-between gap-3 cursor-pointer hover:border-turmeric/60 transition-colors"
            >
              <div className="space-y-0.5 text-xs font-mono">
                <span className="font-bold text-text block">{item.title}</span>
                <span className="font-body text-[11px] text-text-muted block leading-snug">
                  {item.desc}
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(perms[item.key])}
                onChange={() => handleToggle(item.key)}
                className="mt-1 rounded accent-turmeric h-4 w-4 shrink-0"
              />
            </label>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border/70">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto px-4 py-2 font-mono text-xs text-text-muted hover:text-text"
          >
            Not Now (Keep Disabled)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveCustom}
              className="flex-1 sm:flex-none px-4 py-2 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs font-bold"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={handleEnableAll}
              className="flex-1 sm:flex-none px-4 py-2 rounded bg-turmeric hover:bg-turmeric/90 text-bg font-mono text-xs font-bold"
            >
              Enable All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionModal;
