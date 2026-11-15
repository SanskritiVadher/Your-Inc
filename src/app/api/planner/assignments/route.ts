import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";
import { getEffectiveDate } from "@/lib/fsrs";
import { calculateDeadlineRiskScore } from "@/lib/planner/riskScore";
import { parseNaturalLanguageAssignment, extractAssignmentBrief } from "@/lib/planner/naturalLanguageParser";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getApiCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const sortBy = searchParams.get("sortBy") || "risk"; // risk | deadline | progress

    const effectiveNow = await getEffectiveDate(user.id);

    const whereClause: { userId: string; subjectId?: string } = { userId: user.id };
    if (subjectId) whereClause.subjectId = subjectId;

    const rawAssignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, code: true, name: true, color: true } },
        evaluationComponent: { select: { id: true, name: true, weight: true } },
      },
    });

    // Calculate dynamic deadline risk scores
    const assignments = rawAssignments.map((a) => {
      const { riskScore, daysLeft, urgencyLevel } = calculateDeadlineRiskScore(
        a.weight,
        a.progress,
        a.deadline,
        effectiveNow
      );

      return {
        id: a.id,
        title: a.title,
        subjectId: a.subjectId,
        subject: a.subject,
        evaluationComponentId: a.evaluationComponentId,
        evaluationComponent: a.evaluationComponent,
        deadline: a.deadline.toISOString(),
        deliverableFormat: a.deliverableFormat || "PDF Document",
        progress: a.progress,
        customStatus: a.customStatus,
        checklist: a.checklist || [],
        briefText: a.briefText,
        riskScore,
        daysLeft,
        urgencyLevel,
        weight: a.weight,
      };
    });

    // Sort by deadline risk score by default (highest risk first)
    if (sortBy === "risk") {
      assignments.sort((a, b) => b.riskScore - a.riskScore);
    } else if (sortBy === "deadline") {
      assignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    } else if (sortBy === "progress") {
      assignments.sort((a, b) => a.progress - b.progress);
    }

    return NextResponse.json({ assignments });
  } catch (err: unknown) {
    console.error("Assignments API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load assignments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getApiCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;
    const effectiveNow = await getEffectiveDate(user.id);

    // 1. Natural Language Quick Add preview
    if (action === "quick_add_preview") {
      const input = body.input || "";
      const subjects = await prisma.subject.findMany({
        where: { userId: user.id },
        select: { id: true, code: true, name: true },
      });

      const parsed = parseNaturalLanguageAssignment(input, effectiveNow, subjects);
      return NextResponse.json({ parsed });
    }

    // 2. Extract Assignment Brief preview
    if (action === "parse_brief") {
      const briefText = body.briefText || "";
      const extracted = extractAssignmentBrief(briefText);
      return NextResponse.json({ extracted });
    }

    // 3. Create Assignment (either from form or confirmed quick add)
    if (action === "create") {
      const {
        title,
        subjectId,
        subjectCode,
        deadline,
        deliverableFormat,
        evaluationComponentId,
        weight = 15.0,
        checklist = [],
        briefText,
      } = body;

      let resolvedSubjectId = subjectId;
      if (!resolvedSubjectId && subjectCode) {
        const found = await prisma.subject.findFirst({
          where: { userId: user.id, code: subjectCode },
        });
        if (found) resolvedSubjectId = found.id;
      }

      if (!resolvedSubjectId) {
        const firstSubj = await prisma.subject.findFirst({ where: { userId: user.id } });
        resolvedSubjectId = firstSubj?.id;
      }

      if (!resolvedSubjectId) {
        return NextResponse.json({ error: "No subject available to attach assignment" }, { status: 400 });
      }

      const assignment = await prisma.assignment.create({
        data: {
          userId: user.id,
          subjectId: resolvedSubjectId,
          title: title || "New Assignment",
          deadline: new Date(deadline || Date.now() + 3 * 24 * 60 * 60 * 1000),
          deliverableFormat: deliverableFormat || "PDF Document",
          evaluationComponentId: evaluationComponentId || null,
          weight: Number(weight) || 15.0,
          progress: 0.0,
          customStatus: "Not started",
          checklist: checklist || [],
          briefText: briefText || null,
        },
        include: {
          subject: { select: { code: true, name: true } },
        },
      });

      return NextResponse.json({ assignment });
    }

    // 4. Update Progress / Checklist
    if (action === "update") {
      const { id, progress, customStatus, checklist } = body;
      if (!id) return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });

      const updated = await prisma.assignment.update({
        where: { id },
        data: {
          progress: typeof progress === "number" ? progress : undefined,
          customStatus: customStatus || undefined,
          checklist: checklist !== undefined ? checklist : undefined,
        },
      });

      return NextResponse.json({ assignment: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Assignments POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process assignment" },
      { status: 500 }
    );
  }
}
