import { prisma } from "@/lib/prisma";

export interface CalendarEvent {
  id: string;
  title: string;
  type: "CLASS" | "DEADLINE" | "EXAM" | "REVIEW";
  start: Date;
  end: Date;
  subjectCode?: string;
  subjectName?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string
 * for Google Calendar, Apple Calendar, or Outlook subscription.
 */
export function generateIcsFeed(
  calendarName: string,
  events: CalendarEvent[]
): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formatIcsDate = (d: Date): string => {
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      "Z"
    );
  };

  const escapeIcs = (str: string) => {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//You Inc.//MBA LMS Bahi-Khata//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  const nowStr = formatIcsDate(new Date());

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@youinc.mba`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${formatIcsDate(ev.start)}`);
    lines.push(`DTEND:${formatIcsDate(ev.end)}`);
    lines.push(`SUMMARY:${escapeIcs(ev.title)}`);

    if (ev.location) {
      lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    }

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    }

    lines.push(`CATEGORIES:${ev.type}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Compiles all calendar events for a user:
 * - Timetable recurring classes (expanded for current month)
 * - Assignments deadlines
 * - Group project deadlines
 * - Exams
 */
export async function getUserCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const [timetable, assignments, groupProjects, exams] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { userId },
      include: { subject: { select: { code: true, name: true } } },
    }),
    prisma.assignment.findMany({
      where: { userId },
      include: { subject: { select: { code: true, name: true } } },
    }),
    prisma.groupProject.findMany({
      where: { members: { some: { userId } } },
      include: { subject: { select: { code: true, name: true } } },
    }),
    prisma.examPlan.findMany({
      where: { userId },
      include: { subject: { select: { code: true, name: true } } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  // 1. Expand Timetable classes over the next 4 weeks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let week = 0; week < 4; week++) {
    for (const tt of timetable) {
      const classDate = new Date(today);
      const currentDayOfWeek = classDate.getDay() || 7; // 1=Mon .. 7=Sun
      const dayDiff = tt.dayOfWeek - currentDayOfWeek + week * 7;
      classDate.setDate(classDate.getDate() + dayDiff);

      const [sHour, sMin] = tt.startTime.split(":").map(Number);
      const [eHour, eMin] = tt.endTime.split(":").map(Number);

      const start = new Date(classDate);
      start.setHours(sHour, sMin, 0, 0);

      const end = new Date(classDate);
      end.setHours(eHour, eMin, 0, 0);

      events.push({
        id: `class-${tt.id}-w${week}`,
        title: `Class: ${tt.subject.code} — ${tt.subject.name}`,
        type: "CLASS",
        start,
        end,
        subjectCode: tt.subject.code,
        subjectName: tt.subject.name,
        location: tt.room ? `${tt.room}${tt.location ? `, ${tt.location}` : ""}` : tt.location || "Main Campus",
        description: `Scheduled class for ${tt.subject.name} (${tt.subject.code})`,
        isRecurring: true,
      });
    }
  }

  // 2. Assignment Deadlines
  for (const a of assignments) {
    const end = new Date(a.deadline);
    const start = new Date(end.getTime() - 60 * 60 * 1000); // 1 hour block before deadline
    events.push({
      id: `assign-${a.id}`,
      title: `[DEADLINE] ${a.subject.code}: ${a.title}`,
      type: "DEADLINE",
      start,
      end,
      subjectCode: a.subject.code,
      subjectName: a.subject.name,
      description: `Format: ${a.deliverableFormat || "PDF"}\nProgress: ${a.progress}%\nWeight: ${a.weight}%`,
    });
  }

  // 3. Group Project Deadlines
  for (const gp of groupProjects) {
    const end = new Date(gp.deadline);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    events.push({
      id: `gproject-${gp.id}`,
      title: `[TEAM DEADLINE] ${gp.subject.code}: ${gp.title}`,
      type: "DEADLINE",
      start,
      end,
      subjectCode: gp.subject.code,
      subjectName: gp.subject.name,
      description: `Group Project: ${gp.title}`,
    });
  }

  // 4. Exam Dates
  for (const ex of exams) {
    const start = new Date(ex.examDate);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    events.push({
      id: `exam-${ex.id}`,
      title: `[EXAM] ${ex.subject.code} Examination`,
      type: "EXAM",
      start,
      end,
      subjectCode: ex.subject.code,
      subjectName: ex.subject.name,
      description: `Course examination for ${ex.subject.name}`,
    });
  }

  return events;
}
