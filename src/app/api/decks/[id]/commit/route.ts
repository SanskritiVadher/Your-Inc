import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CardType, QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";

interface CommitPayload {
  summary: string;
  concepts: {
    name: string;
    definition: string;
    sourceSlideNumber: number;
    mergeIntoId?: string;
  }[];
  cards: {
    type: CardType;
    conceptName: string;
    front: string;
    back: string;
    errorExplanation?: string;
    sourceSlideNumber: number;
  }[];
  questions: {
    type: QuestionType;
    text: string;
    answerGuide: string;
    difficulty: string;
    sourceSlideNumber: number;
  }[];
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body: CommitPayload = await req.json();
    const { summary, concepts, cards, questions } = body;

    const deck = await prisma.deck.findUnique({
      where: { id: params.id },
      include: { slides: true },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    // Map slide numbers to slide IDs
    const slideNumberToId = new Map<number, string>();
    deck.slides.forEach((s) => {
      slideNumberToId.set(s.number, s.id);
    });

    // 1. Commit concepts and map concept names to concept IDs
    const conceptNameToId = new Map<string, string>();

    for (const c of concepts) {
      if (!c.name.trim()) continue;

      if (c.mergeIntoId) {
        conceptNameToId.set(c.name.toLowerCase(), c.mergeIntoId);
        // Append additional note to existing concept
        const existing = await prisma.concept.findUnique({ where: { id: c.mergeIntoId } });
        if (existing) {
          await prisma.concept.update({
            where: { id: c.mergeIntoId },
            data: { definition: `${existing.definition}\n• Additional note: ${c.definition.trim()}` },
          });
        }
      } else {
        const created = await prisma.concept.create({
          data: {
            subjectId: deck.subjectId,
            name: c.name.trim(),
            definition: c.definition.trim(),
            value: 0.0,
            stability: 0.0,
            difficulty: 0.0,
          },
        });
        conceptNameToId.set(c.name.toLowerCase(), created.id);
      }
    }

    // Fallback concept if any card has unmapped concept name
    let fallbackConceptId = Array.from(conceptNameToId.values())[0];
    if (!fallbackConceptId) {
      const fallback = await prisma.concept.create({
        data: {
          subjectId: deck.subjectId,
          name: `${deck.title} Core`,
          definition: summary || `Foundations from ${deck.title}`,
          value: 0.0,
          stability: 0.0,
          difficulty: 0.0,
        },
      });
      fallbackConceptId = fallback.id;
    }

    // 2. Commit Cards
    for (const card of cards) {
      const conceptId = conceptNameToId.get(card.conceptName.toLowerCase()) || fallbackConceptId;
      const sourceSlideId = slideNumberToId.get(card.sourceSlideNumber) || null;

      await prisma.card.create({
        data: {
          conceptId,
          sourceSlideId,
          type: card.type || "DEFINITION",
          front: card.front,
          back: card.back,
          errorExplanation: card.errorExplanation || null,
        },
      });
    }

    // 3. Commit Questions
    for (const q of questions) {
      const sourceSlideId = slideNumberToId.get(q.sourceSlideNumber) || null;

      await prisma.question.create({
        data: {
          subjectId: deck.subjectId,
          sourceSlideId,
          type: q.type || "EXAM",
          text: q.text,
          answerGuide: q.answerGuide,
          difficulty: q.difficulty || "Medium",
        },
      });
    }

    // 4. Update Deck status to ready
    const updatedDeck = await prisma.deck.update({
      where: { id: deck.id },
      data: {
        summary,
        status: "ready",
        progress: 100,
        processed: true,
      },
    });

    return NextResponse.json({
      success: true,
      deck: updatedDeck,
      cardsCount: cards.length,
      questionsCount: questions.length,
      conceptsCount: concepts.length,
    });
  } catch (err: unknown) {
    console.error("Commit study system error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to commit study system" },
      { status: 500 }
    );
  }
}
