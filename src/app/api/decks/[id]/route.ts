import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deck = await prisma.deck.findUnique({
      where: { id: params.id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        slides: {
          orderBy: { number: "asc" },
          include: {
            cards: true,
            questions: true,
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ deck });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load deck" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { slideId, personalNotes, studentExplanation, isSharedWithCohort, sessionStatus } = body;

    // Update individual slide notes or gap explanation
    if (slideId) {
      const updatedSlide = await prisma.slide.update({
        where: { id: slideId },
        data: {
          ...(personalNotes !== undefined ? { personalNotes } : {}),
          ...(studentExplanation !== undefined ? { studentExplanation, hasGap: false } : {}),
        },
      });
      return NextResponse.json({ success: true, slide: updatedSlide });
    }

    // Update deck-level properties
    const updatedDeck = await prisma.deck.update({
      where: { id: params.id },
      data: {
        ...(isSharedWithCohort !== undefined ? { isSharedWithCohort: Boolean(isSharedWithCohort) } : {}),
        ...(sessionStatus ? { sessionStatus } : {}),
      },
    });

    return NextResponse.json({ success: true, deck: updatedDeck });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update deck" },
      { status: 500 }
    );
  }
}
