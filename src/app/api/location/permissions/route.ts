import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let perm = await prisma.locationPermission.findUnique({
      where: { userId: user.id },
    });

    if (!perm) {
      perm = await prisma.locationPermission.create({
        data: {
          userId: user.id,
          masterEnabled: false,
          focusMapEnabled: false,
          studyZoneRemindersEnabled: false,
          fieldCasesEnabled: false,
        },
      });
    }

    return NextResponse.json({ permission: perm });
  } catch (err: unknown) {
    console.error("Location permission API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load permissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      masterEnabled,
      focusMapEnabled,
      studyZoneRemindersEnabled,
      fieldCasesEnabled,
    } = body;

    const updated = await prisma.locationPermission.upsert({
      where: { userId: user.id },
      update: {
        masterEnabled: typeof masterEnabled === "boolean" ? masterEnabled : undefined,
        focusMapEnabled: typeof focusMapEnabled === "boolean" ? focusMapEnabled : undefined,
        studyZoneRemindersEnabled:
          typeof studyZoneRemindersEnabled === "boolean" ? studyZoneRemindersEnabled : undefined,
        fieldCasesEnabled: typeof fieldCasesEnabled === "boolean" ? fieldCasesEnabled : undefined,
      },
      create: {
        userId: user.id,
        masterEnabled: masterEnabled ?? false,
        focusMapEnabled: focusMapEnabled ?? false,
        studyZoneRemindersEnabled: studyZoneRemindersEnabled ?? false,
        fieldCasesEnabled: fieldCasesEnabled ?? false,
      },
    });

    return NextResponse.json({ permission: updated });
  } catch (err: unknown) {
    console.error("Update permission error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update permissions" },
      { status: 500 }
    );
  }
}
