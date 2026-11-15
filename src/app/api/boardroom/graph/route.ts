import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ nodes: [], links: [] });

    // Fetch all concepts for user
    const concepts = await prisma.concept.findMany({
      where: {
        subject: { userId: user.id },
      },
      include: {
        subject: { select: { id: true, name: true, code: true, color: true } },
        cards: { select: { id: true, sourceSlideId: true } },
      },
      orderBy: { value: "asc" },
    });

    // Fetch all confirmed concept links
    const conceptIds = concepts.map((c) => c.id);
    const links = await prisma.conceptLink.findMany({
      where: {
        fromConceptId: { in: conceptIds },
        toConceptId: { in: conceptIds },
        confirmed: true,
      },
      select: {
        id: true,
        fromConceptId: true,
        toConceptId: true,
        reason: true,
      },
    });

    const nodes = concepts.map((c) => {
      let risk: "critical" | "warning" | "healthy" = "healthy";
      if (c.value < 50) risk = "critical";
      else if (c.value < 75) risk = "warning";

      return {
        id: c.id,
        name: c.name,
        definition: c.definition,
        value: c.value,
        stability: c.stability,
        difficulty: c.difficulty,
        risk,
        subjectId: c.subject.id,
        subjectName: c.subject.name,
        subjectCode: c.subject.code,
        subjectColor: c.subject.color,
        cardCount: c.cards.length,
      };
    });

    return NextResponse.json({
      nodes,
      links: links.map((l) => ({
        id: l.id,
        source: l.fromConceptId,
        target: l.toConceptId,
        reason: l.reason,
      })),
    });
  } catch (err: unknown) {
    console.error("Concept graph error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load graph data" },
      { status: 500 }
    );
  }
}
