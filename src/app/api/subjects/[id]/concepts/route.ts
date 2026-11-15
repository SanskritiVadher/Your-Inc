import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ConceptSaveInput {
  name: string;
  definition: string;
  mergeIntoId?: string;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const concepts = await prisma.concept.findMany({
      where: { subjectId: params.id },
      include: {
        cards: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ concepts });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load concepts" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { concepts }: { concepts: ConceptSaveInput[] } = body;

    if (!Array.isArray(concepts) || concepts.length === 0) {
      return NextResponse.json(
        { error: "No concepts submitted for confirmation" },
        { status: 400 }
      );
    }

    const savedResults = [];

    for (const item of concepts) {
      if (!item.name || !item.name.trim()) continue;

      if (item.mergeIntoId) {
        // Merge into existing concept: append or refine definition
        const existing = await prisma.concept.findUnique({
          where: { id: item.mergeIntoId },
        });
        if (existing) {
          const updated = await prisma.concept.update({
            where: { id: item.mergeIntoId },
            data: {
              definition: `${existing.definition}\n• Additional note: ${item.definition.trim()}`,
            },
          });
          savedResults.push(updated);
          continue;
        }
      }

      // Create new concept asset
      const created = await prisma.concept.create({
        data: {
          subjectId: params.id,
          name: item.name.trim(),
          definition: item.definition.trim(),
          value: 0.0,
          stability: 0.0,
          difficulty: 0.0,
        },
      });
      savedResults.push(created);
    }

    return NextResponse.json({
      success: true,
      savedCount: savedResults.length,
      concepts: savedResults,
    });
  } catch (err: unknown) {
    console.error("Save concepts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save concepts" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get("conceptId");

    if (!conceptId) {
      return NextResponse.json({ error: "conceptId is required" }, { status: 400 });
    }

    await prisma.concept.delete({
      where: { id: conceptId },
    });

    return NextResponse.json({ success: true, deletedId: conceptId });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete concept" },
      { status: 500 }
    );
  }
}
