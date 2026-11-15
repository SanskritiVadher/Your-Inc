import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CardType } from "@prisma/client";

export const dynamic = "force-dynamic";

interface CandidateCard {
  type: CardType;
  front: string;
  back: string;
  errorExplanation?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, approvedCards } = body;

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: {
        concept: true,
        subject: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // ACTION: Commit approved cards
    if (action === "commit" && Array.isArray(approvedCards) && approvedCards.length > 0) {
      let conceptId = note.conceptId;

      // If note wasn't tagged to a concept, link to or create one
      if (!conceptId) {
        const fallbackConcept = await prisma.concept.create({
          data: {
            subjectId: note.subjectId,
            name: note.title,
            definition: note.content.substring(0, 150) || "Note generated asset",
          },
        });
        conceptId = fallbackConcept.id;
        await prisma.note.update({
          where: { id: note.id },
          data: { conceptId },
        });
      }

      const createdCards = [];
      for (const c of approvedCards) {
        const card = await prisma.card.create({
          data: {
            conceptId,
            sourceSlideId: note.slideId,
            type: c.type || "DEFINITION",
            front: c.front,
            back: c.back,
            errorExplanation: c.errorExplanation || null,
            state: 0, // New card
          },
        });
        createdCards.push(card);
      }

      return NextResponse.json({
        success: true,
        count: createdCards.length,
        cards: createdCards,
      });
    }

    // DEFAULT ACTION: Generate candidate cards from note content
    const content = note.content;
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);
    const title = note.title;

    const candidates: CandidateCard[] = [
      {
        type: "DEFINITION",
        front: `Define the primary concept discussed in "${title}".`,
        back: lines[0] || `${title}: Key framework discussed during lecture.`,
      },
      {
        type: "APPLICATION",
        front: `How does "${title}" apply to operational tradeoffs in Indian commerce?`,
        back: `Applied context: Demands balancing capital allocation against customer acquisition, as outlined in note observations: ${lines.slice(0, 2).join(" ")}`,
      },
      {
        type: "SPOT_ERROR",
        front: `Spot the flaw: "Regarding ${title}, management should maximize short-term accounting profits regardless of liquidity risk."`,
        back: `Correction: Short-term profit maximization without liquidity buffers leads to insolvency risk; operations must maintain solvent working capital.`,
        errorExplanation: `Never compromise solvency for temporary reported accounting numbers.`,
      },
      {
        type: "THREE_POINTS",
        front: `Explain "${title}" in exactly 3 managerial points.`,
        back: `1. Principle: ${lines[0] || "Foundational premise"}\n2. Application: ${lines[1] || "Operational mechanism"}\n3. Strategic Risk: ${lines[2] || "Execution pitfall"}`,
      },
    ];

    return NextResponse.json({
      success: true,
      noteId: note.id,
      noteTitle: note.title,
      suggestedCards: candidates,
    });
  } catch (err: unknown) {
    console.error("Make cards error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to suggest cards" },
      { status: 500 }
    );
  }
}
