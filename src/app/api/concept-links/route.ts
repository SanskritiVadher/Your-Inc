import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cosineSimilarity, generateDeterministicEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    // Fetch confirmed concept links
    const existingLinks = await prisma.conceptLink.findMany({
      include: {
        fromConcept: {
          include: { subject: { select: { id: true, name: true, code: true } } },
        },
        toConcept: {
          include: { subject: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-suggest cross-department links if requested
    const allConcepts = await prisma.concept.findMany({
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    const suggestions = [];

    // Pairwise cross-department comparison
    for (let i = 0; i < allConcepts.length; i++) {
      for (let j = i + 1; j < allConcepts.length; j++) {
        const c1 = allConcepts[i];
        const c2 = allConcepts[j];

        // Only suggest cross-subject links
        if (c1.subjectId === c2.subjectId) continue;

        // Skip if link already exists in DB
        const alreadyLinked = existingLinks.some(
          (l) =>
            (l.fromConceptId === c1.id && l.toConceptId === c2.id) ||
            (l.fromConceptId === c2.id && l.toConceptId === c1.id)
        );
        if (alreadyLinked) continue;

        const vec1 = generateDeterministicEmbedding(`${c1.name} ${c1.definition}`);
        const vec2 = generateDeterministicEmbedding(`${c2.name} ${c2.definition}`);
        const sim = cosineSimilarity(vec1, vec2);

        // High cross-domain semantic resonance
        if (sim >= 0.55) {
          suggestions.push({
            fromConcept: c1,
            toConcept: c2,
            similarity: Number(sim.toFixed(3)),
            reason: `Cross-department synergy between ${c1.subject.name} and ${c2.subject.name}: Shared quantitative / strategic foundation in "${c1.name}" and "${c2.name}".`,
          });
        }
      }
    }

    return NextResponse.json({
      links: existingLinks,
      suggestions: suggestions.slice(0, 8),
    });
  } catch (err: unknown) {
    console.error("Concept links error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load concept links" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromConceptId, toConceptId, reason, confirmed = true } = body;

    if (!fromConceptId || !toConceptId || !reason) {
      return NextResponse.json(
        { error: "fromConceptId, toConceptId, and reason are required" },
        { status: 400 }
      );
    }

    const link = await prisma.conceptLink.create({
      data: {
        fromConceptId,
        toConceptId,
        reason: reason.trim(),
        confirmed,
      },
      include: {
        fromConcept: { include: { subject: true } },
        toConcept: { include: { subject: true } },
      },
    });

    return NextResponse.json({ success: true, link });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create concept link" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, confirmed } = body;

    if (!id) {
      return NextResponse.json({ error: "Link id required" }, { status: 400 });
    }

    const updated = await prisma.conceptLink.update({
      where: { id },
      data: { confirmed: Boolean(confirmed) },
    });

    return NextResponse.json({ success: true, link: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update link" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Link id required" }, { status: 400 });
    }

    await prisma.conceptLink.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete link" },
      { status: 500 }
    );
  }
}
