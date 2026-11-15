import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeckStudySystem } from "@/lib/deckGenerator";
import { ParsedSlide } from "@/lib/deckParser";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deck = await prisma.deck.findUnique({
      where: { id: params.id },
      include: {
        slides: { orderBy: { number: "asc" } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Update status to understanding / generating
    await prisma.deck.update({
      where: { id: deck.id },
      data: { status: "generating", progress: 70 },
    });

    const parsedSlides: ParsedSlide[] = deck.slides.map((s) => ({
      number: s.number,
      title: s.text.split("\n")[0] || `Slide ${s.number}`,
      text: s.text,
      notes: s.notes || undefined,
      imageUrl: s.imageUrl || undefined,
      hasGap: s.hasGap,
      gapReason: s.gapReason || undefined,
    }));

    const generated = await generateDeckStudySystem(
      deck.title,
      parsedSlides,
      deck.subjectId,
      deck.userId || undefined
    );

    return NextResponse.json({
      success: true,
      deckId: deck.id,
      title: deck.title,
      slideCount: deck.slides.length,
      ...generated,
    });
  } catch (err: unknown) {
    console.error("Deck generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate study system" },
      { status: 500 }
    );
  }
}
