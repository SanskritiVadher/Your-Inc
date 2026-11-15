"use client";

import React, { useState } from "react";
import {
  CalendarCheck2,
  Calendar,
  Users,
  Bell,
  Sparkles,
  Layers,
} from "lucide-react";
import { AssignmentManager } from "./AssignmentManager";
import { CalendarView } from "./CalendarView";
import { GroupProjectWorkspace } from "./GroupProjectWorkspace";
import { NotificationCenterModal } from "./NotificationCenterModal";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";

export const PlannerContainerClient: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"assignments" | "calendar" | "groups">("assignments");
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return (
    <div className="space-y-6 font-body">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <span className="font-body text-xs text-indigo font-semibold">
            Schedule &amp; Deadlines
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal mt-0.5">
            Course Planner &amp; Projects
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted mt-0.5 font-body">
            Track upcoming assignments and project milestones to keep your deadline record on track.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNotificationModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded border border-border hover:border-turmeric bg-surface text-text font-body text-xs font-medium transition-colors shadow-xs shrink-0"
        >
          <Bell className="w-4 h-4 text-turmeric" />
          <span>Reminders &amp; alerts</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs font-body overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "assignments"
              ? "border-sindoor text-sindoor bg-surface/60 font-semibold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>Assignments &amp; deadlines</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "calendar"
              ? "border-sindoor text-sindoor bg-surface/60 font-semibold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar &amp; timetable</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "groups"
              ? "border-sindoor text-sindoor bg-surface/60 font-semibold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Group projects workspace</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "assignments" && <AssignmentManager />}
        {activeTab === "calendar" && <CalendarView />}
        {activeTab === "groups" && <GroupProjectWorkspace />}
      </div>

      {/* Notification Protocol Modal */}
      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </div>
  );
};
