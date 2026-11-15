import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultSkills,
  calculateSkillScore,
  suggestConceptSkillMappings,
} from "@/lib/career/skillScore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureDefaultSkills(user.id);

    // Fetch skills with their mapped concepts and mock interviews
    const [skills, mockInterviews] = await Promise.all([
      prisma.skill.findMany({
        where: { userId: user.id },
        include: {
          skillConcepts: {
            where: { confirmed: true },
            include: {
              concept: {
                select: {
                  id: true,
                  name: true,
                  value: true,
                  subject: { select: { code: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.mockInterview.findMany({
        where: { userId: user.id, completed: true },
        select: {
          id: true,
          mode: true,
          performanceScore: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Compute live calculated proficiency for each skill
    const skillsWithLiveScore = skills.map((s) => {
      const conceptValues = s.skillConcepts.map((sc) => ({
        value: sc.concept.value,
        weight: sc.weight,
      }));

      // Filter mocks relevant to this skill category/mode
      const relevantMocks = mockInterviews.filter((m) => {
        if (s.name === "Product Sense" || s.name === "Data & AI") return m.mode === "PM";
        if (s.name === "Strategy" || s.name === "Market Sizing") return m.mode === "CONSULTING";
        if (s.name === "Marketing" || s.name === "Consumer Research") return m.mode === "MARKETING";
        if (s.name === "Leadership & OB" || s.name === "Communication") return m.mode === "BEHAVIOURAL";
        return true;
      });

      const mockScores = relevantMocks.map((m) => m.performanceScore);
      const computedScore = calculateSkillScore(conceptValues, mockScores);

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        proficiency: computedScore,
        conceptCount: s.skillConcepts.length,
        concepts: s.skillConcepts.map((sc) => ({
          id: sc.concept.id,
          name: sc.concept.name,
          value: sc.concept.value,
          department: sc.concept.subject.code,
          weight: sc.weight,
        })),
      };
    });

    // AI suggestions for concept mapping
    const suggestions = await suggestConceptSkillMappings(user.id);

    return NextResponse.json({
      skills: skillsWithLiveScore,
      suggestions,
    });
  } catch (err: unknown) {
    console.error("Skills GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load skills" },
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

    // 1. Confirm Concept-to-Skill mapping
    if (action === "confirm_mapping") {
      const { skillId, conceptId, weight = 1.0 } = body;
      if (!skillId || !conceptId) {
        return NextResponse.json({ error: "Missing skill or concept ID" }, { status: 400 });
      }

      const mapping = await prisma.skillConcept.upsert({
        where: {
          skillId_conceptId: { skillId, conceptId },
        },
        create: {
          skillId,
          conceptId,
          confirmed: true,
          weight: Number(weight) || 1.0,
          suggestedByAi: false,
        },
        update: {
          confirmed: true,
          weight: Number(weight) || 1.0,
        },
      });

      return NextResponse.json({ mapping });
    }

    // 2. Add custom skill
    if (action === "add_skill") {
      const { name, category = "General" } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Skill name is required" }, { status: 400 });
      }

      const skill = await prisma.skill.create({
        data: {
          userId: user.id,
          name: name.trim(),
          category: category.trim(),
          proficiency: 50.0,
        },
      });

      return NextResponse.json({ skill });
    }

    // 3. Rename skill
    if (action === "rename_skill") {
      const { skillId, newName } = body;
      if (!skillId || !newName?.trim()) {
        return NextResponse.json({ error: "Invalid rename parameters" }, { status: 400 });
      }

      const skill = await prisma.skill.update({
        where: { id: skillId },
        data: { name: newName.trim() },
      });

      return NextResponse.json({ skill });
    }

    // 4. Delete skill
    if (action === "delete_skill") {
      const { skillId } = body;
      if (!skillId) {
        return NextResponse.json({ error: "Skill ID required" }, { status: 400 });
      }

      await prisma.skill.delete({
        where: { id: skillId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Skills POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute skill action" },
      { status: 500 }
    );
  }
}
