import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export interface SendNotificationPayload {
  userId: string;
  type: "DEADLINE_48H" | "DEADLINE_6H" | "DAILY_REVIEWS" | "GROUP_TASK_ASSIGNED" | "MEETING_ACTION_ITEM";
  title: string;
  message: string;
  link?: string;
  forcePush?: boolean; // Used for imminent deadlines < 6 hours away
}

/**
 * Checks if the current time falls inside the student's configured Quiet Hours.
 */
export function isInsideQuietHours(
  currentTime: Date,
  startStr = "22:00",
  endStr = "08:00"
): boolean {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentMins = currentHour * 60 + currentMinute;

  const [sHour, sMin] = startStr.split(":").map(Number);
  const startMins = sHour * 60 + (sMin || 0);

  const [eHour, eMin] = endStr.split(":").map(Number);
  const endMins = eHour * 60 + (eMin || 0);

  if (startMins > endMins) {
    // Crosses midnight (e.g. 22:00 to 08:00)
    return currentMins >= startMins || currentMins < endMins;
  } else {
    // Same day (e.g. 13:00 to 15:00)
    return currentMins >= startMins && currentMins < endMins;
  }
}

/**
 * Dispatches an alert with quiet hours & max 3 push notifications/day enforcement.
 */
export async function dispatchNotification(payload: SendNotificationPayload): Promise<{
  dispatched: boolean;
  channel: "IN_APP" | "PUSH" | "BLOCKED_BY_PREFERENCE" | "BLOCKED_BY_QUIET_HOURS";
  reason?: string;
}> {
  const { userId, type, title, message, link, forcePush } = payload;
  const effectiveNow = await getEffectiveDate(userId);

  // 1. Fetch user's notification preferences
  let settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.notificationSettings.create({
      data: {
        userId,
        calendarExportToken: `cal-${userId.slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
      },
    });
  }

  // 2. Check individual alert type toggle
  let isTypeEnabled = true;
  if (type === "DEADLINE_48H" && !settings.notifyDeadline48h) isTypeEnabled = false;
  if (type === "DEADLINE_6H" && !settings.notifyDeadline6h) isTypeEnabled = false;
  if (type === "DAILY_REVIEWS" && !settings.notifyDailyReviews) isTypeEnabled = false;
  if (type === "GROUP_TASK_ASSIGNED" && !settings.notifyGroupTasks) isTypeEnabled = false;
  if (type === "MEETING_ACTION_ITEM" && !settings.notifyMeetingActions) isTypeEnabled = false;

  if (!isTypeEnabled) {
    return {
      dispatched: false,
      channel: "BLOCKED_BY_PREFERENCE",
      reason: `Notification type ${type} disabled in student settings.`,
    };
  }

  // Always create IN_APP notification record
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      channel: "IN_APP",
      sentAt: effectiveNow,
      read: false,
    },
  });

  // 3. Check Quiet Hours
  if (settings.quietHoursEnabled && isInsideQuietHours(effectiveNow, settings.quietHoursStart, settings.quietHoursEnd)) {
    return {
      dispatched: true,
      channel: "BLOCKED_BY_QUIET_HOURS",
      reason: `Quiet hours active (${settings.quietHoursStart} - ${settings.quietHoursEnd}). In-app alert logged, push suppressed.`,
    };
  }

  // 4. Check Push Cap: Max 3 push notifications per day (unless deadline < 6h away)
  const startOfDay = new Date(effectiveNow);
  startOfDay.setHours(0, 0, 0, 0);

  const pushCountToday = await prisma.notification.count({
    where: {
      userId,
      channel: "PUSH",
      sentAt: { gte: startOfDay },
    },
  });

  const isCriticalUrgent = type === "DEADLINE_6H" || forcePush;

  if (pushCountToday >= 3 && !isCriticalUrgent) {
    return {
      dispatched: true,
      channel: "IN_APP",
      reason: `Daily push cap reached (${pushCountToday}/3). Alert routed to In-App notification feed.`,
    };
  }

  // Log as PUSH dispatch
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      channel: "PUSH",
      sentAt: effectiveNow,
      read: false,
    },
  });

  return { dispatched: true, channel: "PUSH" };
}
