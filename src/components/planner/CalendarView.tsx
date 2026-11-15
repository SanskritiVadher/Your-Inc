"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  GraduationCap,
  X,
  Copy,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: "CLASS" | "DEADLINE" | "EXAM" | "REVIEW";
  start: string;
  end: string;
  subjectCode?: string;
  subjectName?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
}

interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  location?: string | null;
  subject: {
    id: string;
    code: string;
    name: string;
    color: string;
  };
}

interface Subject {
  id: string;
  code: string;
  name: string;
  color: string;
}

export const CalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [calendarToken, setCalendarToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Add Recurring Class Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1); // 1 = Mon
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("11:00");
  const [room, setRoom] = useState("CR-201");
  const [location, setLocation] = useState("Academic Block 1");

  const fetchCalendar = () => {
    fetch("/api/planner/calendar")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
        if (data.timetable) setTimetable(data.timetable);
        if (data.subjects) {
          setSubjects(data.subjects);
          if (data.subjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(data.subjects[0].id);
          }
        }
        if (data.calendarExportToken) setCalendarToken(data.calendarExportToken);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch calendar:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/planner/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_timetable_entry",
          subjectId: selectedSubjectId,
          dayOfWeek: selectedDay,
          startTime,
          endTime,
          room,
          location,
        }),
      });
      if (res.ok) {
        setShowClassModal(false);
        fetchCalendar();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const icsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/ics?token=${calendarToken}`
      : `/api/calendar/ics?token=${calendarToken}`;

  const handleCopyIcs = () => {
    navigator.clipboard.writeText(icsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6 font-body">
      {/* 1. Header with View Toggle & Google Calendar Subscription Banner */}
      <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
              Academic Timetable &amp; Schedule
            </span>
            <span className="text-xs font-mono text-text-muted">
              Live Google Calendar / Apple Calendar Sync
            </span>
          </div>
          <h3 className="font-heading text-xl text-text">Master Calendar</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded border border-border bg-bg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "week" ? "bg-surface text-text font-bold shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              Week View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "month" ? "bg-surface text-text font-bold shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              Month View
            </button>
          </div>

          {/* Add Recurring Class Button */}
          <button
            type="button"
            onClick={() => setShowClassModal(true)}
            className="px-3.5 py-1.5 rounded bg-turmeric text-bg font-mono text-xs font-bold hover:bg-turmeric/90 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Recurring Class</span>
          </button>

          {/* Copy ICS Subscription Feed Link */}
          <button
            type="button"
            onClick={handleCopyIcs}
            className="px-3.5 py-1.5 rounded border border-border hover:border-turmeric bg-surface text-text font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-leaf" />
                <span>Copied .ics Feed!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-turmeric" />
                <span>Subscribe via .ics</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Timetable / Calendar Grid */}
      {viewMode === "week" ? (
        /* Week Grid */
        <div className="bg-surface border border-border rounded-lg overflow-x-auto shadow-sm">
          <div className="grid grid-cols-7 min-w-[700px] border-b border-border text-center text-xs font-mono py-2 bg-bg/50">
            {daysOfWeek.map((day, i) => (
              <div key={day} className="py-1 border-r border-border/50 last:border-r-0 font-bold text-text">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-w-[700px] divide-x divide-border/50 text-xs font-mono min-h-[380px]">
            {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
              const dayClasses = timetable.filter((t) => t.dayOfWeek === dayNum);
              return (
                <div key={dayNum} className="p-2 space-y-2 bg-surface/40">
                  {dayClasses.length === 0 ? (
                    <div className="text-[10px] text-text-muted/50 text-center py-6 italic">
                      No classes
                    </div>
                  ) : (
                    dayClasses.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded bg-bg border border-border/80 space-y-1 hover:border-turmeric/60 transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text text-[11px]">{item.subject.code}</span>
                          <span className="text-[9px] text-text-muted">{item.startTime}</span>
                        </div>
                        <div className="font-heading text-xs text-text truncate">{item.subject.name}</div>
                        <div className="text-[10px] text-text-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-turmeric" />
                          <span>{item.room || "Audi"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Month Overview: Upcoming Events List */
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="font-heading text-lg text-text">30-Day Master Event Log</h4>
            <span className="text-xs font-mono text-text-muted">{events.length} Synchronized Events</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 18).map((ev) => {
              const isDeadline = ev.type === "DEADLINE";
              const isExam = ev.type === "EXAM";

              return (
                <div
                  key={ev.id}
                  className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 transition-all ${
                    isDeadline
                      ? "bg-sindoor/10 border-sindoor/30 text-text"
                      : isExam
                      ? "bg-primary/10 border-primary/30 text-text"
                      : "bg-bg border-border text-text"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-bold uppercase px-1.5 py-0.2 rounded ${
                        isDeadline
                          ? "bg-sindoor/20 text-sindoor"
                          : isExam
                          ? "bg-primary/20 text-primary"
                          : "bg-turmeric/20 text-turmeric"
                      }`}
                    >
                      {ev.type}
                    </span>
                    <span className="text-text-muted">
                      {new Date(ev.start).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="font-heading text-sm text-text font-bold line-clamp-1">{ev.title}</div>

                  {ev.location && (
                    <div className="text-[10px] text-text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-turmeric" />
                      <span>{ev.location}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Add Recurring Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-turmeric rounded-lg max-w-md w-full p-6 shadow-xl relative font-body">
            <button
              type="button"
              onClick={() => setShowClassModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-xl text-text mb-1">Add Recurring Class to Timetable</h3>
            <p className="text-xs text-text-muted mb-4 font-mono">
              Recurring timetable blocks sync into Google Calendar and Morning Dossiers.
            </p>

            <form onSubmit={handleAddClass} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">Academic Department</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-text-muted block mb-1">Day of Week</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="w-full p-2 border border-border bg-bg text-text rounded"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={7}>Sunday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-text-muted block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-border bg-bg text-text rounded"
                    required
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-border bg-bg text-text rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-text-muted block mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full p-2 border border-border bg-bg text-text rounded"
                    placeholder="e.g. CR-201"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Campus Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 border border-border bg-bg text-text rounded"
                    placeholder="e.g. South Wing"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3 py-1.5 text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-turmeric text-bg font-bold rounded hover:bg-turmeric/90"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
