import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserCalendarEvents } from "@/lib/planner/calendarIcs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [events, timetable, subjects] = await Promise.all([
      getUserCalendarEvents(user.id),
      prisma.timetableEntry.findMany({
        where: { userId: user.id },
        include: { subject: { select: { id: true, code: true, name: true, color: true } } },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.subject.findMany({
        where: { userId: user.id },
        select: { id: true, code: true, name: true, color: true },
      }),
    ]);

    // Ensure a calendar export token exists for Google Calendar .ics subscription
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

    return NextResponse.json({
      events,
      timetable,
      subjects,
      calendarExportToken: settings.calendarExportToken,
    });
  } catch (err: unknown) {
    console.error("Calendar API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load calendar" },
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

    if (action === "add_timetable_entry") {
      const { subjectId, dayOfWeek, startTime, endTime, room, location } = body;

      if (!subjectId || !dayOfWeek || !startTime || !endTime) {
        return NextResponse.json({ error: "Missing required timetable parameters" }, { status: 400 });
      }

      const entry = await prisma.timetableEntry.create({
        data: {
          userId: user.id,
          subjectId,
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime,
          room: room || "Audi 1",
          location: location || "Main Campus",
        },
        include: {
          subject: { select: { code: true, name: true } },
        },
      });

      return NextResponse.json({ entry });
    }

    if (action === "delete_timetable_entry") {
      const { id } = body;
      await prisma.timetableEntry.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Calendar POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update calendar" },
      { status: 500 }
    );
  }
}
