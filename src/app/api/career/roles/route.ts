import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRoleGaps, ensureDefaultSkills, calculateSkillScore } from "@/lib/career/skillScore";
import { calculatePlacementCountdown } from "@/lib/career/countdown";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        placementStartDate: true,
        targetRoles: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDefaultSkills(user.id);

    // Fetch user skills to evaluate gaps
    const [skills, mockInterviews] = await Promise.all([
      prisma.skill.findMany({
        where: { userId: user.id },
        include: {
          skillConcepts: {
            where: { confirmed: true },
            include: { concept: { select: { value: true } } },
          },
        },
      }),
      prisma.mockInterview.findMany({
        where: { userId: user.id, completed: true },
        select: { mode: true, performanceScore: true },
      }),
    ]);

    const skillsForGaps = skills.map((s) => {
      const conceptValues = s.skillConcepts.map((sc) => ({ value: sc.concept.value, weight: 1.0 }));
      const relevantMocks = mockInterviews.filter((m) => {
        if (s.name === "Product Sense" || s.name === "Data & AI") return m.mode === "PM";
        if (s.name === "Strategy" || s.name === "Market Sizing") return m.mode === "CONSULTING";
        return true;
      });
      const score = calculateSkillScore(conceptValues, relevantMocks.map((m) => m.performanceScore));
      return { name: s.name, proficiency: score };
    });

    // Default target role if student hasn't picked yet
    let targetRoles = user.targetRoles;
    if (targetRoles.length === 0) {
      const defaultRole = await prisma.targetRole.create({
        data: {
          userId: user.id,
          roleName: "Product Manager",
          targetProficiency: 85.0,
        },
      });
      targetRoles = [defaultRole];
    }

    // Compute gap analysis for each chosen role
    const gapsPerRole = targetRoles.map((r) => calculateRoleGaps(r.roleName, skillsForGaps));

    // Calculate placement countdown if date set (default: 8 weeks out if unset)
    const placementDate = user.placementStartDate || new Date(Date.now() + 56 * 24 * 60 * 60 * 1000);
    const primaryRole = targetRoles[0]?.roleName || "Product Manager";
    const primaryGaps = gapsPerRole[0]?.weakestSkills.map((w) => w.name) || ["Market Sizing", "Data & AI"];
    const mockAvg =
      mockInterviews.length > 0
        ? mockInterviews.reduce((sum, m) => sum + m.performanceScore, 0) / mockInterviews.length
        : 70.0;

    const countdown = calculatePlacementCountdown(
      new Date(placementDate),
      new Date(),
      primaryRole,
      primaryGaps,
      mockAvg
    );

    return NextResponse.json({
      targetRoles,
      gapsPerRole,
      placementStartDate: user.placementStartDate,
      countdown,
    });
  } catch (err: unknown) {
    console.error("Roles GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load roles" },
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

    // 1. Set / Update Target Roles (up to 3)
    if (action === "set_roles") {
      const { roles } = body; // Array of role strings: ["Product Manager", "Management Consultant"]
      if (!Array.isArray(roles) || roles.length === 0) {
        return NextResponse.json({ error: "Provide at least 1 target role" }, { status: 400 });
      }

      const roleSlice = roles.slice(0, 3); // Max 3
      await prisma.targetRole.deleteMany({ where: { userId: user.id } });

      for (const rName of roleSlice) {
        await prisma.targetRole.create({
          data: {
            userId: user.id,
            roleName: rName.trim(),
            targetProficiency: 85.0,
          },
        });
      }

      const updated = await prisma.targetRole.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ targetRoles: updated });
    }

    // 2. Set Placement Season Start Date
    if (action === "set_placement_date") {
      const { date } = body;
      if (!date) {
        return NextResponse.json({ error: "Date is required" }, { status: 400 });
      }

      const parsedDate = new Date(date);
      await prisma.user.update({
        where: { id: user.id },
        data: { placementStartDate: parsedDate },
      });

      return NextResponse.json({ placementStartDate: parsedDate });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Roles POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process target roles" },
      { status: 500 }
    );
  }
}
