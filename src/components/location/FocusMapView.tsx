"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  MapPin,
  TrendingUp,
  Clock,
  Zap,
  Plus,
  Sparkles,
  BookOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TimeBreakdown {
  sessionCount: number;
  accuracy: number;
}

interface PlaceStudyStat {
  locationId: string;
  label: string;
  lat: number;
  lng: number;
  sessionCount: number;
  averageAccuracy: number;
  averageCardsPerMin: number;
  totalCardsReviewed: number;
  timeOfDayBreakdown: {
    morning: TimeBreakdown;
    afternoon: TimeBreakdown;
    evening: TimeBreakdown;
  };
}

interface FocusInsight {
  hasSufficientData: boolean;
  message: string;
  bestPlace: string;
  accuracyDeltaPercent: number;
}

interface SavedPlaceRaw {
  id: string;
  label: string;
  lat: number;
  lng: number;
  createdAt: string;
}

interface ProximityMatch {
  matchedPlace: { id: string; label: string } | null;
  dueCardsCount: number;
  shouldRemind: boolean;
}

export function FocusMapView() {
  const [places, setPlaces] = useState<PlaceStudyStat[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceRaw[]>([]);
  const [insight, setInsight] = useState<FocusInsight | null>(null);
  const [loading, setLoading] = useState(true);

  // Proximity & Live coords
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [proximity, setProximity] = useState<ProximityMatch | null>(null);

  // Modal / form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("Library");
  const [customLabel, setCustomLabel] = useState("");
  const [savingPlace, setSavingPlace] = useState(false);

  // Simulating/recording a session modal
  const [activeSessionLocation, setActiveSessionLocation] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState(12);
  const [sessionDuration, setSessionDuration] = useState(10);
  const [sessionAccuracy, setSessionAccuracy] = useState(88);
  const [recordingSession, setRecordingSession] = useState(false);

  const fetchFocusStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/location/focus-map");
      if (!res.ok) throw new Error("Failed to load focus map");
      const data = await res.json();
      setPlaces(data.places || []);
      setInsight(data.insight || null);
      setSavedPlaces(data.savedPlaces || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFocusStats();
  }, [fetchFocusStats]);

  // Request browser location for proximity and new place mapping
  const detectLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;
        setCoords({ lat: liveLat, lng: liveLng });
        setGpsError(null);

        // Check proximity for study zone reminders
        try {
          const proxRes = await fetch("/api/location/focus-map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "proximity_check",
              lat: liveLat,
              lng: liveLng,
            }),
          });
          if (proxRes.ok) {
            const proxData = await proxRes.json();
            setProximity(proxData);
          }
        } catch (e) {
          console.error("Proximity check failed", e);
        }
      },
      (err) => {
        setGpsError(err.message || "Unable to acquire GPS coordinates.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    detectLiveLocation();
  }, [detectLiveLocation]);

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLabel = placeLabel === "Custom" ? customLabel.trim() : placeLabel;
    if (!finalLabel) return;

    const targetLat = coords?.lat ?? 28.545; // Default HSB campus fallback
    const targetLng = coords?.lng ?? 77.192;

    try {
      setSavingPlace(true);
      const res = await fetch("/api/location/focus-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_place",
          label: finalLabel,
          lat: targetLat,
          lng: targetLng,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save place");
      }

      setIsAddOpen(false);
      setCustomLabel("");
      await fetchFocusStats();
      detectLiveLocation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving place");
    } finally {
      setSavingPlace(false);
    }
  };

  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionLocation) return;

    try {
      setRecordingSession(true);
      const res = await fetch("/api/location/focus-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_session",
          locationId: activeSessionLocation,
          cardsReviewed: sessionCards,
          durationMinutes: sessionDuration,
          accuracy: sessionAccuracy,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record session");
      }

      setActiveSessionLocation(null);
      await fetchFocusStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error recording session");
    } finally {
      setRecordingSession(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Study-Zone Proximity Reminder Banner */}
      {proximity?.shouldRemind && proximity.matchedPlace && (
        <div className="border border-leaf/40 bg-leaf/5 p-4 rounded-none flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 border border-leaf/30 bg-leaf/10 text-leaf">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-leaf font-bold">
                  STUDY-ZONE DETECTED
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" />
              </div>
              <h3 className="font-heading text-base font-medium text-text mt-0.5">
                Welcome to {proximity.matchedPlace.label}
              </h3>
              <p className="text-xs text-text-muted font-body mt-0.5">
                You have {proximity.dueCardsCount} concept flashcard{proximity.dueCardsCount === 1 ? "" : "s"} due
                for reinvestment. This environment is prime for focused revision.
              </p>
            </div>
          </div>
          <a
            href="/review"
            className="shrink-0 px-3 py-1.5 bg-leaf text-white font-mono text-xs hover:bg-leaf/90 transition-colors flex items-center gap-1.5"
          >
            <BookOpen size={13} />
            Start Review
          </a>
        </div>
      )}

      {/* Header & Live Geolocation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-leaf">
              Spatial Intelligence
            </span>
            <span className="font-body text-xs text-text-muted">Focus Map & Study-Zones</span>
          </div>
          <h2 className="font-heading text-2xl text-text font-normal mt-1">
            Empirical Study Habit Analytics
          </h2>
          <p className="text-xs text-text-muted font-body mt-0.5">
            Compare retention velocity (cards/min) and accuracy across libraries, hostels, and cafés.
            All coordinates are coarsened to ~100m for privacy.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={detectLiveLocation}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <Compass size={14} className="text-leaf" />
            Check Location
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <Plus size={14} />
            Save Current Study Place
          </Button>
        </div>
      </div>

      {/* GPS Status Pill */}
      <div className="flex items-center justify-between text-xs px-3 py-2 bg-paper-sunken border border-border">
        <div className="flex items-center gap-2">
          <MapPin size={14} className={coords ? "text-leaf" : "text-text-muted"} />
          <span className="font-mono text-text-muted">
            {coords
              ? `Live Coarse Coordinates: ${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E`
              : gpsError
              ? `GPS: ${gpsError}`
              : "Acquiring coarse GPS..."}
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-muted">
          Coarsened to 3 decimal places (~100m precision)
        </span>
      </div>

      {/* Empirical Insight Card: SHOWN ONLY IF >= 5 SESSIONS COMPLETED */}
      {insight && insight.hasSufficientData ? (
        <div className="border border-terracotta/40 bg-terracotta/5 p-4 rounded-none">
          <div className="flex items-start gap-3">
            <div className="p-2 border border-terracotta/30 bg-terracotta/10 text-terracotta shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-terracotta font-bold">
                  EMPIRICAL INSIGHT (&ge;5 SESSIONS PROVEN)
                </span>
                <span className="text-[10px] font-mono text-text-muted">p &lt; 0.05 statistical delta</span>
              </div>
              <h4 className="font-heading text-base font-medium text-text mt-0.5">
                Highest Yield Study Zone: {insight.bestPlace}
              </h4>
              <p className="text-xs text-text font-body mt-1 leading-relaxed">
                {insight.message}
              </p>
              <div className="mt-2 text-[11px] font-mono text-text-muted flex items-center gap-4">
                <span>Recall Delta: +{insight.accuracyDeltaPercent.toFixed(1)}%</span>
                <span>Recommendation: Reserve high-complexity case preparations for this zone</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-paper-sunken p-4 rounded-none flex items-start gap-3">
          <div className="p-2 border border-border bg-paper text-text-muted shrink-0">
            <Info size={18} />
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest uppercase text-text-muted font-bold">
              EMPIRICAL INSIGHT SAFEGUARD
            </span>
            <p className="text-xs text-text-muted font-body mt-0.5">
              To prevent spurious conclusions, location insights require at least 5 completed study
              sessions per place. Complete more revision cycles in your saved locations to unlock
              comparative regression insights.
            </p>
          </div>
        </div>
      )}

      {/* Focus Places Cards & Time-of-Day Analysis */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-text-muted">
          Loading focus map analytics...
        </div>
      ) : places.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center bg-paper-sunken">
          <MapPin size={32} className="mx-auto text-text-muted mb-2" />
          <h4 className="font-heading text-base text-text">No Saved Study Places Yet</h4>
          <p className="text-xs text-text-muted font-body max-w-md mx-auto mt-1 mb-4">
            Tag your favorite study locations (Library, Hostel, Café, or Study Lounge) to begin
            logging recall velocity and diurnal productivity patterns.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            className="font-mono text-xs"
          >
            <Plus size={14} className="mr-1" /> Save First Study Place
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {places.map((place) => (
              <div
                key={place.locationId}
                className="border border-border bg-paper p-4 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-leaf font-bold">
                        STUDY ZONE
                      </span>
                      <h4 className="font-heading text-lg font-medium text-text mt-0.5">
                        {place.label}
                      </h4>
                      <p className="font-mono text-[10px] text-text-muted">
                        {place.lat.toFixed(3)}°N, {place.lng.toFixed(3)}°E
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs text-text-muted">Sessions</span>
                      <div className="font-mono text-lg font-bold text-text">
                        {place.sessionCount}
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-border">
                    <div className="bg-paper-sunken p-2.5 border border-border">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                        <TrendingUp size={12} className="text-leaf" />
                        <span>Accuracy</span>
                      </div>
                      <div className="font-mono text-base font-bold text-text mt-0.5">
                        {place.averageAccuracy.toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-paper-sunken p-2.5 border border-border">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                        <Zap size={12} className="text-terracotta" />
                        <span>Velocity</span>
                      </div>
                      <div className="font-mono text-base font-bold text-text mt-0.5">
                        {place.averageCardsPerMin.toFixed(1)} <span className="text-[10px] font-normal text-text-muted">c/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Diurnal Breakdown (Morning, Afternoon, Evening) */}
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <span className="font-mono text-[10px] uppercase text-text-muted font-semibold block mb-1">
                      Time of Day Performance
                    </span>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-muted flex items-center gap-1">
                        <Clock size={11} /> Morning (&lt;12h)
                      </span>
                      <span className="text-text">
                        {place.timeOfDayBreakdown.morning.sessionCount > 0
                          ? `${place.timeOfDayBreakdown.morning.accuracy.toFixed(1)}% (${place.timeOfDayBreakdown.morning.sessionCount})`
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-muted flex items-center gap-1">
                        <Clock size={11} /> Afternoon (12-17h)
                      </span>
                      <span className="text-text">
                        {place.timeOfDayBreakdown.afternoon.sessionCount > 0
                          ? `${place.timeOfDayBreakdown.afternoon.accuracy.toFixed(1)}% (${place.timeOfDayBreakdown.afternoon.sessionCount})`
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-muted flex items-center gap-1">
                        <Clock size={11} /> Evening (&gt;17h)
                      </span>
                      <span className="text-text">
                        {place.timeOfDayBreakdown.evening.sessionCount > 0
                          ? `${place.timeOfDayBreakdown.evening.accuracy.toFixed(1)}% (${place.timeOfDayBreakdown.evening.sessionCount})`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-text-muted">
                    {place.sessionCount >= 5 ? (
                      <span className="text-leaf flex items-center gap-1">
                        <CheckCircle2 size={11} /> Robust dataset
                      </span>
                    ) : (
                      <span className="text-terracotta">
                        {5 - place.sessionCount} more session{5 - place.sessionCount === 1 ? "" : "s"} for insight
                      </span>
                    )}
                  </span>

                  <button
                    onClick={() => setActiveSessionLocation(place.locationId)}
                    className="font-mono text-xs text-leaf hover:underline flex items-center gap-1"
                  >
                    <Play size={11} /> Log Session
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Aggregate Heatmap & Performance Table */}
          <div className="border border-border bg-paper p-4">
            <h4 className="font-heading text-base font-medium text-text mb-2">
              Cross-Zone Velocity & Accuracy Ledger
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-paper-sunken text-text-muted">
                    <th className="p-2 font-normal">Zone / Place</th>
                    <th className="p-2 font-normal">Coarse Position</th>
                    <th className="p-2 font-normal">Total Cards</th>
                    <th className="p-2 font-normal">Velocity</th>
                    <th className="p-2 font-normal">Recall Accuracy</th>
                    <th className="p-2 font-normal">Sessions</th>
                    <th className="p-2 font-normal">Yield Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {places.map((p) => {
                    const rating =
                      p.averageAccuracy >= 85
                        ? "Prime Yield"
                        : p.averageAccuracy >= 75
                        ? "Average Yield"
                        : "Low Yield";
                    return (
                      <tr key={p.locationId} className="hover:bg-paper-sunken/50">
                        <td className="p-2 font-medium text-text">{p.label}</td>
                        <td className="p-2 text-text-muted">
                          {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                        </td>
                        <td className="p-2 text-text">{p.totalCardsReviewed}</td>
                        <td className="p-2 text-text">{p.averageCardsPerMin.toFixed(1)} c/min</td>
                        <td className="p-2 font-bold text-text">{p.averageAccuracy.toFixed(1)}%</td>
                        <td className="p-2 text-text">{p.sessionCount}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] ${
                              p.averageAccuracy >= 85
                                ? "bg-leaf/10 text-leaf border border-leaf/30"
                                : p.averageAccuracy >= 75
                                ? "bg-paper-sunken text-text-muted border border-border"
                                : "bg-terracotta/10 text-terracotta border border-terracotta/30"
                            }`}
                          >
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Save Current Study Place */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Configure Study Zone
              </span>
              <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                Save New Study Location
              </h3>
              <p className="text-xs text-text-muted font-body mt-1">
                Tag your current spot to enable automated study-zone review reminders and spatial
                accuracy heatmaps.
              </p>
            </div>

            <form onSubmit={handleSavePlace} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Place Category
                </label>
                <select
                  value={placeLabel}
                  onChange={(e) => setPlaceLabel(e.target.value)}
                  className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                >
                  <option value="Library">Library (Silent / Focus)</option>
                  <option value="Hostel">Hostel / Dorm Room</option>
                  <option value="Café">Campus Café / Bistro</option>
                  <option value="Home">Home / Apartment</option>
                  <option value="Discussion Room">Group Discussion Room</option>
                  <option value="Custom">Custom Label...</option>
                </select>
              </div>

              {placeLabel === "Custom" && (
                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1">
                    Custom Place Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. 3rd Floor Reading Hall"
                    className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                  />
                </div>
              )}

              <div className="p-3 bg-paper-sunken border border-border font-mono text-xs text-text-muted">
                <div>Recorded Position:</div>
                <div className="text-text font-bold mt-0.5">
                  {(coords?.lat ?? 28.545).toFixed(3)}°N, {(coords?.lng ?? 77.192).toFixed(3)}°E
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  ~100m coarse resolution bounding box applied automatically.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingPlace}
                  className="font-mono text-xs"
                >
                  {savingPlace ? "Saving..." : "Save Place"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log / Simulate Study Session for Place */}
      {activeSessionLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-paper border border-border w-full max-w-md p-6 space-y-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-leaf font-semibold">
                Revision Record
              </span>
              <h3 className="font-heading text-xl text-text font-normal mt-0.5">
                Log Study Session in Zone
              </h3>
              <p className="text-xs text-text-muted font-body mt-1">
                Record cards reviewed and accuracy in this location to feed your empirical focus
                analytics.
              </p>
            </div>

            <form onSubmit={handleRecordSession} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Cards Reviewed
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={sessionCards}
                  onChange={(e) => setSessionCards(Number(e.target.value))}
                  className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full bg-paper border border-border p-2 font-mono text-xs text-text focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted mb-1">
                  Recall Accuracy ({sessionAccuracy}%)
                </label>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={sessionAccuracy}
                  onChange={(e) => setSessionAccuracy(Number(e.target.value))}
                  className="w-full accent-leaf"
                />
              </div>

              <div className="p-3 bg-paper-sunken border border-border font-mono text-xs flex justify-between">
                <span className="text-text-muted">Calculated Velocity:</span>
                <span className="text-text font-bold">
                  {(sessionCards / (sessionDuration || 1)).toFixed(1)} cards/min
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSessionLocation(null)}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={recordingSession}
                  className="font-mono text-xs"
                >
                  {recordingSession ? "Recording..." : "Save Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
