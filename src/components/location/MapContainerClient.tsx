"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Building2,
  Shield,
  Layers,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { FocusMapView } from "./FocusMapView";
import { FieldCasesView } from "./FieldCasesView";
import { LocationPrivacyView } from "./LocationPrivacyView";
import { PermissionModal, PermissionSettings } from "./PermissionModal";

type ActiveTab = "focus" | "field-cases" | "privacy";

export function MapContainerClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("focus");
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionSettings>({
    masterEnabled: false,
    focusMapEnabled: false,
    studyZoneRemindersEnabled: false,
    fieldCasesEnabled: false,
  });
  const [loaded, setLoaded] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/location/permissions");
      if (res.ok) {
        const json = await res.json();
        if (json.permission) {
          setPermissions(json.permission);
        }
      }
    } catch (err) {
      console.error("Failed to load location permissions", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleSavePermissions = async (updated: PermissionSettings) => {
    try {
      const res = await fetch("/api/location/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const json = await res.json();
        setPermissions(json.permission);
      }
    } catch (err) {
      console.error("Failed to save location permissions", err);
    } finally {
      setIsPermModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Location Privacy Status & Master Override Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper-sunken border border-border">
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <Shield
            size={16}
            className={permissions.masterEnabled ? "text-leaf" : "text-text-muted"}
          />
          <span className="text-text-muted">Location Status:</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-bold ${
              permissions.masterEnabled
                ? "bg-leaf/10 text-leaf border border-leaf/30"
                : "bg-paper text-text-muted border border-border"
            }`}
          >
            {permissions.masterEnabled ? "OPT-IN ACTIVE" : "LOCATION OFF (APP FULLY FUNCTIONAL)"}
          </span>
          <span className="hidden md:inline text-text-muted text-[11px]">
            &bull; No background tracking &bull; 90-day auto-purge &bull; ~100m coarse resolution
          </span>
        </div>

        <button
          onClick={() => setIsPermModalOpen(true)}
          className="font-mono text-xs text-leaf hover:underline flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Settings size={13} />
          Privacy Charter & Permissions
        </button>
      </div>

      {/* Notice if Location is Off */}
      {!permissions.masterEnabled && loaded && (
        <div className="border border-border bg-paper p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-text-muted shrink-0 mt-0.5" />
          <div className="text-xs font-body text-text-muted leading-relaxed">
            <strong className="text-text font-mono text-[11px] uppercase">
              Location Services Standby:
            </strong>{" "}
            You Inc. is designed to work 100% normally without geolocation. Study sessions
            can be logged manually, and all deck uploads and review cards operate without spatial data.
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex border-b border-border font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("focus")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "focus"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Compass size={14} className={activeTab === "focus" ? "text-leaf" : ""} />
          Focus Map & Velocity
        </button>

        <button
          onClick={() => setActiveTab("field-cases")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "field-cases"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Building2 size={14} className={activeTab === "field-cases" ? "text-leaf" : ""} />
          Field Cases & Journal
        </button>

        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "privacy"
              ? "border-leaf text-text font-bold bg-paper"
              : "border-transparent text-text-muted hover:text-text hover:bg-paper-sunken"
          }`}
        >
          <Shield size={14} className={activeTab === "privacy" ? "text-leaf" : ""} />
          Privacy & Data Ledger
        </button>
      </div>

      {/* Active Tab Sub-view */}
      <div>
        {activeTab === "focus" && <FocusMapView />}
        {activeTab === "field-cases" && <FieldCasesView />}
        {activeTab === "privacy" && <LocationPrivacyView />}
      </div>

      {/* Privacy Modal */}
      <PermissionModal
        isOpen={isPermModalOpen}
        currentPermissions={permissions}
        onSave={handleSavePermissions}
        onDismiss={() => setIsPermModalOpen(false)}
      />
    </div>
  );
}
