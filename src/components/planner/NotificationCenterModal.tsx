"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Moon,
  Shield,
  Check,
  Clock,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Send,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  channel: string;
  sentAt: string;
}

interface NotificationSettingsData {
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursEnabled: boolean;
  notifyDeadline48h: boolean;
  notifyDeadline6h: boolean;
  notifyDailyReviews: boolean;
  reviewReminderTime: string;
  notifyGroupTasks: boolean;
  notifyMeetingActions: boolean;
  calendarExportToken: string;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"feed" | "settings">("feed");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const fetchData = () => {
    fetch("/api/planner/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
        if (data.settings) setSettings(data.settings);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleSaveSettings = async (newSettings: NotificationSettingsData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/planner/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          ...newSettings,
        }),
      });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/planner/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestDispatch = async (forcePush = false) => {
    setTestMessage(null);
    try {
      const res = await fetch("/api/planner/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_dispatch",
          type: forcePush ? "DEADLINE_6H" : "DEADLINE_48H",
          title: forcePush ? "Urgent Deadline: Under 6h Remaining" : "Upcoming Deadline (48h Notice)",
          message: "Finance valuation deliverable approaching cutoff.",
          forcePush,
        }),
      });
      const data = await res.json();
      if (data.reason) {
        setTestMessage(`Dispatch Result: ${data.channel} · ${data.reason}`);
      } else {
        setTestMessage(`Dispatch Result: ${data.channel} · Alert successfully delivered!`);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-turmeric rounded-lg max-w-xl w-full p-6 shadow-2xl relative font-body max-h-[90vh] flex flex-col">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-border/70 pb-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-turmeric/20 text-turmeric">
              Alert History
            </span>
          </div>
          <h3 className="font-heading text-2xl text-text font-bold">
            Alerts &amp; Notification Protocol
          </h3>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Strict respect for attention: Quiet hours &amp; capped at max 3 daily push alerts.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === "feed" ? "bg-turmeric text-bg font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              Alert Feed ({notifications.filter((n) => !n.read).length} unread)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === "settings" ? "bg-turmeric text-bg font-bold" : "text-text-muted hover:text-text"
              }`}
            >
              Quiet Hours &amp; Preferences
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-mono">
          {activeTab === "feed" ? (
            /* Feed Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Recent System Notifications</span>
                {notifications.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-turmeric hover:underline"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 border border-border rounded bg-bg text-center text-text-muted">
                  No alerts currently in history.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded border space-y-1 transition-colors ${
                      n.read ? "bg-bg border-border text-text-muted" : "bg-turmeric/10 border-turmeric text-text"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase tracking-wider">{n.type}</span>
                      <span>
                        {new Date(n.sentAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="font-heading text-sm text-text font-bold">{n.title}</div>
                    <p className="font-body text-xs text-text-muted">{n.message}</p>
                  </div>
                ))
              )}

              {/* Test Dispatch Trigger */}
              <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-text-muted">Verify Dispatch Logic:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestDispatch(false)}
                    className="px-2.5 py-1 text-[11px] rounded border border-border bg-bg hover:border-turmeric"
                  >
                    Test Standard (48h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestDispatch(true)}
                    className="px-2.5 py-1 text-[11px] rounded border border-sindoor text-sindoor hover:bg-sindoor/10"
                  >
                    Test Critical (&lt;6h)
                  </button>
                </div>
              </div>

              {testMessage && (
                <div className="p-2.5 rounded bg-bg border border-turmeric text-[11px] text-text">
                  {testMessage}
                </div>
              )}
            </div>
          ) : (
            /* Settings Tab */
            settings && (
              <div className="space-y-4">
                {/* Quiet Hours Section */}
                <div className="p-3.5 rounded bg-bg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo" />
                      <span className="font-bold text-text">Quiet Hours (Do Not Disturb)</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.quietHoursEnabled}
                        onChange={(e) => {
                          const updated = { ...settings, quietHoursEnabled: e.target.checked };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        }}
                        className="rounded accent-turmeric"
                      />
                      <span className="text-[11px]">Enabled</span>
                    </label>
                  </div>

                  <p className="font-body text-[11px] text-text-muted leading-snug">
                    During quiet hours, push alerts are blocked entirely and stored quietly in your in-app notifications.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] text-text-muted block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => {
                          const updated = { ...settings, quietHoursStart: e.target.value };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        }}
                        className="w-full p-2 border border-border bg-surface text-text rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted block mb-1">End Time</label>
                      <input
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => {
                          const updated = { ...settings, quietHoursEnd: e.target.value };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        }}
                        className="w-full p-2 border border-border bg-surface text-text rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Individual Channel Toggles */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-text block">
                    Individual Alert Controls:
                  </span>

                  {[
                    {
                      key: "notifyDeadline48h",
                      label: "Coursework Deadline 48h Advance Notice",
                      val: settings.notifyDeadline48h,
                    },
                    {
                      key: "notifyDeadline6h",
                      label: "Critical Coursework Deadline 6h Urgency Alert",
                      val: settings.notifyDeadline6h,
                    },
                    {
                      key: "notifyDailyReviews",
                      label: `Daily Review Reminder at ${settings.reviewReminderTime}`,
                      val: settings.notifyDailyReviews,
                    },
                    {
                      key: "notifyGroupTasks",
                      label: "Group Project Task Assignments",
                      val: settings.notifyGroupTasks,
                    },
                    {
                      key: "notifyMeetingActions",
                      label: "Meeting Minutes & Action Items Assigned to You",
                      val: settings.notifyMeetingActions,
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="p-2.5 rounded bg-bg border border-border flex items-center justify-between cursor-pointer hover:border-turmeric/60 transition-colors"
                    >
                      <span className="text-text">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(item.val)}
                        onChange={(e) => {
                          const updated = { ...settings, [item.key]: e.target.checked };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        }}
                        className="rounded accent-turmeric"
                      />
                    </label>
                  ))}
                </div>

                {/* Daily Push Cap Guarantee */}
                <div className="p-3 rounded bg-turmeric/10 border border-turmeric/30 text-[11px] text-text flex items-center gap-2">
                  <Shield className="w-4 h-4 text-turmeric shrink-0" />
                  <span>
                    <strong>Anti-Spam Protocol:</strong> Maximum 3 push alerts dispatched per day, unless a deadline is under 6 hours away.
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
