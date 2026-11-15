import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/planner/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: user.id,
          calendarExportToken: `cal-${user.id.slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
        },
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      settings,
      notifications,
    });
  } catch (err: unknown) {
    console.error("Notifications API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // 1. Update Notification Preferences
    if (action === "update_settings") {
      const {
        quietHoursStart,
        quietHoursEnd,
        quietHoursEnabled,
        notifyDeadline48h,
        notifyDeadline6h,
        notifyDailyReviews,
        reviewReminderTime,
        notifyGroupTasks,
        notifyMeetingActions,
      } = body;

      const updated = await prisma.notificationSettings.upsert({
        where: { userId: user.id },
        update: {
          quietHoursStart,
          quietHoursEnd,
          quietHoursEnabled,
          notifyDeadline48h,
          notifyDeadline6h,
          notifyDailyReviews,
          reviewReminderTime,
          notifyGroupTasks,
          notifyMeetingActions,
        },
        create: {
          userId: user.id,
          calendarExportToken: `cal-${user.id.slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
          quietHoursStart: quietHoursStart || "22:00",
          quietHoursEnd: quietHoursEnd || "08:00",
          quietHoursEnabled: quietHoursEnabled ?? true,
          notifyDeadline48h: notifyDeadline48h ?? true,
          notifyDeadline6h: notifyDeadline6h ?? true,
          notifyDailyReviews: notifyDailyReviews ?? true,
          reviewReminderTime: reviewReminderTime || "18:00",
          notifyGroupTasks: notifyGroupTasks ?? true,
          notifyMeetingActions: notifyMeetingActions ?? true,
        },
      });

      return NextResponse.json({ settings: updated });
    }

    // 2. Mark Notification as Read
    if (action === "mark_read") {
      const { notificationId } = body;
      if (notificationId) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { read: true },
        });
      } else {
        await prisma.notification.updateMany({
          where: { userId: user.id, read: false },
          data: { read: true },
        });
      }
      return NextResponse.json({ success: true });
    }

    // 3. Test Alert Dispatch
    if (action === "test_dispatch") {
      const { type, title, message, forcePush } = body;
      const result = await dispatchNotification({
        userId: user.id,
        type: type || "DEADLINE_48H",
        title: title || "Assignment Deadline Alert",
        message: message || "Your coursework deliverable is approaching solvency audit.",
        forcePush: Boolean(forcePush),
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Notifications POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process notification" },
      { status: 500 }
    );
  }
}
