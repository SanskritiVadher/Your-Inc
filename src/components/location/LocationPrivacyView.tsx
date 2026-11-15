"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Download,
  Trash2,
  Lock,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StoredRecordSummary {
  exportedAt: string;
  locations: Array<{
    id: string;
    label: string;
    lat: number;
    lng: number;
    createdAt: string;
  }>;
  fieldCases: Array<{
    id: string;
    areaName: string;
    lat: number;
    lng: number;
    completed: boolean;
    createdAt: string;
  }>;
}

interface PermissionsData {
  masterEnabled: boolean;
  focusMapEnabled: boolean;
  studyZoneRemindersEnabled: boolean;
  fieldCasesEnabled: boolean;
}

export function LocationPrivacyView() {
  const [data, setData] = useState<StoredRecordSummary | null>(null);
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingMaster, setTogglingMaster] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchPrivacyData = useCallback(async () => {
    try {
      setLoading(true);
      const [dataRes, permRes] = await Promise.all([
        fetch("/api/location/privacy"),
        fetch("/api/location/permissions"),
      ]);

      if (dataRes.ok) {
        const json = await dataRes.json();
        setData(json);
      }
      if (permRes.ok) {
        const permJson = await permRes.json();
        setPermissions(permJson.permission);
      }
    } catch (err: unknown) {
      console.error("Failed to load privacy data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrivacyData();
  }, [fetchPrivacyData]);

  const handleToggleMaster = async (enabled: boolean) => {
    try {
      setTogglingMaster(true);
      const res = await fetch("/api/location/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterEnabled: enabled,
          // When turning off master, shut down all sub-features
          focusMapEnabled: enabled ? permissions?.focusMapEnabled : false,
          studyZoneRemindersEnabled: enabled ? permissions?.studyZoneRemindersEnabled : false,
          fieldCasesEnabled: enabled ? permissions?.fieldCasesEnabled : false,
        }),
      });

      if (!res.ok) throw new Error("Failed to update master switch");
      const json = await res.json();
      setPermissions(json.permission);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating permission");
    } finally {
      setTogglingMaster(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const res = await fetch("/api/location/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_all" }),
      });

      if (!res.ok) throw new Error("Failed to delete location records");
      setConfirmDelete(false);
      await fetchPrivacyData();
      alert("All location data, saved places, and field cases have been deleted.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error wiping location records");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (format: "json" | "csv") => {
    window.open(`/api/location/privacy?format=${format}&download=true`, "_blank");
  };

  const totalPoints =
    (data?.locations?.length || 0) +
    (data?.fieldCases?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Privacy & Transparency
            </span>
            <span className="font-body text-xs text-text-muted">Location Privacy Ledger</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Data Ledger & Privacy Controls
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Full auditability of every stored location entry. Download your raw ledger at any time
            or permanently wipe all spatial records with one click.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("json")}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <FileCode size={13} />
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("csv")}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <FileSpreadsheet size={13} />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 font-mono text-xs text-terracotta border-terracotta/40 hover:bg-terracotta/10"
          >
            <Trash2 size={13} />
            Delete All Data
          </Button>
        </div>
      </div>

      {/* Master Off Switch Banner */}
      <div className="border border-border bg-paper p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 border ${
              permissions?.masterEnabled
                ? "bg-leaf/10 border-leaf/30 text-leaf"
                : "bg-paper-sunken border-border text-text-muted"
            }`}
          >
            <Lock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-text">
                Master Location Services
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                  permissions?.masterEnabled
                    ? "bg-leaf/10 text-leaf border border-leaf/30"
                    : "bg-paper-sunken text-text-muted border border-border"
                }`}
              >
                {permissions?.masterEnabled ? "Active / Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-text-muted font-body mt-0.5 max-w-xl">
              When disabled, focus map spatial logging and nearby field case
              scanners are halted. The rest of the app operates with full functionality.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Button
            variant={permissions?.masterEnabled ? "outline" : "primary"}
            size="sm"
            disabled={togglingMaster}
            onClick={() => handleToggleMaster(!permissions?.masterEnabled)}
            className="font-mono text-xs"
          >
            {permissions?.masterEnabled ? "Turn Master Off" : "Turn Master On"}
          </Button>
        </div>
      </div>

      {/* 3 Pillars of Privacy Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border bg-paper p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-leaf">
            <EyeOff size={16} />
            <span>Coarse Coordinate Obfuscation</span>
          </div>
          <p className="text-xs text-text-muted font-body leading-relaxed">
            All spatial features automatically truncate coordinates to 3 decimal places (~100m
            box). Exact domestic or private addresses are never written to the database.
          </p>
        </div>

        <div className="border border-border bg-paper p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-leaf">
            <Calendar size={16} />
            <span>90-Day Auto-Purge Policy</span>
          </div>
          <p className="text-xs text-text-muted font-body leading-relaxed">
            Raw coordinates and high-precision GPS logs are automatically scrubbed after 90 days.
            Only historical aggregate stats are preserved.
          </p>
        </div>

        <div className="border border-border bg-paper p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-leaf">
            <Shield size={16} />
            <span>Opt-In Privacy</span>
          </div>
          <p className="text-xs text-text-muted font-body leading-relaxed">
            Spatial intelligence never runs in background workers. Location is queried
            only when you explicitly trigger an action or save a study place.
          </p>
        </div>
      </div>

      {/* Stored Location Inspector Ledger */}
      <div className="border border-border bg-paper p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-medium text-text">
              Active Spatial Records Ledger
            </h3>
            <p className="font-mono text-xs text-text-muted mt-0.5">
              Total stored coordinates across all models: {totalPoints}
            </p>
          </div>

          <button
            onClick={fetchPrivacyData}
            className="font-mono text-xs text-text-muted hover:text-text flex items-center gap-1"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-text-muted">
            Auditing stored database points...
          </div>
        ) : totalPoints === 0 ? (
          <div className="border border-dashed border-border p-6 text-center bg-paper-sunken font-mono text-xs text-text-muted">
            Ledger clean. Zero spatial records or coordinates currently stored in database.
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Saved Focus Places */}
            {data?.locations && data.locations.length > 0 && (
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-text-muted block mb-2">
                  Saved Focus Places ({data.locations.length})
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border bg-paper-sunken text-text-muted">
                        <th className="p-2 font-normal">Label</th>
                        <th className="p-2 font-normal">Coarse Position</th>
                        <th className="p-2 font-normal">Recorded Date</th>
                        <th className="p-2 font-normal">Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.locations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-paper-sunken/40">
                          <td className="p-2 text-text font-medium">{loc.label}</td>
                          <td className="p-2 text-text-muted">
                            {loc.lat.toFixed(3)}°N, {loc.lng.toFixed(3)}°E
                          </td>
                          <td className="p-2 text-text-muted">
                            {new Date(loc.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-leaf text-[11px]">~100m Coarse</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Field Cases */}
            {data?.fieldCases && data.fieldCases.length > 0 && (
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-text-muted block mb-2">
                  Field Cases ({data.fieldCases.length})
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border bg-paper-sunken text-text-muted">
                        <th className="p-2 font-normal">Area</th>
                        <th className="p-2 font-normal">Coarse Position</th>
                        <th className="p-2 font-normal">Status</th>
                        <th className="p-2 font-normal">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.fieldCases.map((fc) => (
                        <tr key={fc.id} className="hover:bg-paper-sunken/40">
                          <td className="p-2 text-text font-medium">{fc.areaName}</td>
                          <td className="p-2 text-text-muted">
                            {fc.lat.toFixed(3)}°N, {fc.lng.toFixed(3)}°E
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] ${
                                fc.completed
                                  ? "bg-leaf/10 text-leaf border border-leaf/30"
                                  : "bg-paper-sunken text-text-muted border border-border"
                              }`}
                            >
                              {fc.completed ? "COMPLETED" : "PENDING"}
                            </span>
                          </td>
                          <td className="p-2 text-text-muted">
                            {new Date(fc.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Delete All Location Data */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-terracotta/10 border border-terracotta/30 text-terracotta shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-terracotta font-semibold">
                  Irreversible Wipe
                </span>
                <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                  Delete All Spatial Data?
                </h3>
                <p className="text-xs text-text-muted font-body mt-1">
                  This will permanently delete all saved focus places and field case records.
                  Your course subjects, flashcards, and notes will remain completely intact.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={handleDeleteAll}
                className="bg-terracotta text-white hover:bg-terracotta/90 border-transparent font-mono text-xs"
              >
                {deleting ? "Deleting..." : "Permanently Wipe Data"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
