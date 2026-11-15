import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserCalendarEvents, generateIcsFeed } from "@/lib/planner/calendarIcs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    let userId: string | null = null;
    let calendarName = "You Inc. MBA Schedule";

    if (token) {
      const settings = await prisma.notificationSettings.findUnique({
        where: { calendarExportToken: token },
        include: { user: { select: { id: true, name: true, companyName: true } } },
      });
      if (settings?.user) {
        userId = settings.user.id;
        calendarName = `${settings.user.companyName || settings.user.name} Schedule`;
      }
    }

    if (!userId) {
      const fallbackUser = await prisma.user.findFirst({
        select: { id: true, name: true, companyName: true },
      });
      if (!fallbackUser) {
        return new NextResponse("Calendar Feed Not Found", { status: 404 });
      }
      userId = fallbackUser.id;
      calendarName = `${fallbackUser.companyName || fallbackUser.name} Schedule`;
    }

    const events = await getUserCalendarEvents(userId);
    const icsContent = generateIcsFeed(calendarName, events);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="you-inc-calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("ICS Feed Generation Error:", err);
    return new NextResponse("Something went wrong. Try again.", { status: 500 });
  }
}
