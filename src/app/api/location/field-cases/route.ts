import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateFieldCaseForLocation,
  gradeFieldCaseSubmission,
} from "@/lib/location/fieldCases";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Active uncompleted case draft
    const activeCase = await prisma.fieldCase.findFirst({
      where: { userId: user.id, completed: false },
      include: {
        concept: { select: { id: true, name: true, subject: { select: { code: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Completed field journal cases
    const fieldJournal = await prisma.fieldCase.findMany({
      where: { userId: user.id, completed: true },
      include: {
        concept: { select: { id: true, name: true, subject: { select: { code: true, name: true } } } },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      activeCase,
      fieldJournal,
    });
  } catch (err: unknown) {
    console.error("Field cases API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load field cases" },
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

    // 1. Generate Micro-Case from Real OSM POIs
    if (action === "generate") {
      const lat = Number(body.lat) || 28.545; // Default HSB/campus coordinate fallback
      const lng = Number(body.lng) || 77.192;

      const generated = await generateFieldCaseForLocation(user.id, lat, lng);
      return NextResponse.json({ fieldCase: generated });
    }

    // 2. Submit Answer for Executive Grading & Reinvestment
    if (action === "submit_answer") {
      const { fieldCaseId, studentAnswer } = body;
      if (!fieldCaseId || !studentAnswer?.trim()) {
        return NextResponse.json({ error: "Missing submission answer" }, { status: 400 });
      }

      const evaluation = await gradeFieldCaseSubmission(fieldCaseId, user.id, studentAnswer);
      return NextResponse.json(evaluation);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Field cases POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process field case" },
      { status: 500 }
    );
  }
}
