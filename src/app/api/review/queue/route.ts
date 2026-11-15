import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";
import { getEffectiveDate, calculateRetrievability } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "all"; // all | by_subject | by_deck | weakest_first | exam_mode
    const subjectId = searchParams.get("subjectId");
    const deckId = searchParams.get("deckId");

    const user = await getApiCurrentUser();
    if (!user) return NextResponse.json({ cards: [] });

    const effectiveNow = await getEffectiveDate(user.id);

    // Build filter
    const whereClause: Record<string, unknown> = {
      concept: {
        subject: {
          userId: user.id,
          ...(subjectId ? { id: subjectId } : {}),
        },
      },
      ...(deckId ? { sourceSlide: { deckId } } : {}),
    };

    if (mode === "exam_mode") {
      // Only high-weight concepts (e.g. weight >= 20% components)
      whereClause.concept = {
        ...((whereClause.concept as object) || {}),
        subject: {
          evaluationComponents: {
            some: { weight: { gte: 20 } },
          },
        },
      };
    }

    // Retrieve eligible cards
    const allCards = await prisma.card.findMany({
      where: whereClause,
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            value: true,
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                keepFresh: true,
                termId: true,
                term: {
                  select: {
                    id: true,
                    name: true,
                    isCurrent: true,
                    isArchived: true,
                  },
                },
              },
            },
          },
        },
        sourceSlide: {
          select: { id: true, number: true, deckId: true },
        },
      },
      orderBy: { due: "asc" },
    });

    // Partition into Due Review Cards vs New Cards
    const dueCards = [];
    const newCards = [];
    const pastSemesterKeepFreshPool = [];

    for (const card of allCards) {
      const isPastSemester = card.concept.subject.term && !card.concept.subject.term.isCurrent;
      const keepFreshEnabled = card.concept.subject.keepFresh !== false;

      if (isPastSemester && keepFreshEnabled) {
        pastSemesterKeepFreshPool.push({
          ...card,
          isKeepFresh: true,
          semesterName: card.concept.subject.term?.name || "Past Semester",
        });
      } else if (card.state === 0 || card.reps === 0) {
        newCards.push(card);
      } else if (new Date(card.due) <= effectiveNow) {
        dueCards.push(card);
      }
    }

    // Cap new cards per day by user limit (default 20)
    const dailyLimit = user.dailyNewCardLimit || 20;
    const cappedNewCards = newCards.slice(0, dailyLimit);

    // Gently mix in 2-3 "Keep fresh" cards from past semesters so knowledge stays retained
    const keepFreshSlice = pastSemesterKeepFreshPool.slice(0, 3);

    // Combine queue
    let queue = [...dueCards, ...cappedNewCards, ...keepFreshSlice];

    // If queue is empty, include a small refresher batch so user can always study
    if (queue.length === 0 && allCards.length > 0) {
      queue = allCards.slice(0, 10).map((c) => ({
        ...c,
        isKeepFresh: c.concept.subject.term && !c.concept.subject.term.isCurrent,
        semesterName: c.concept.subject.term?.name || "Semester 1",
      }));
    }

    // Sort according to mode
    if (mode === "weakest_first") {
      queue.sort((a, b) => a.concept.value - b.concept.value);
    }

    return NextResponse.json({
      effectiveDate: effectiveNow.toISOString(),
      totalDue: dueCards.length,
      newCardsCapped: cappedNewCards.length,
      queueLength: queue.length,
      cards: queue,
    });
  } catch (err: unknown) {
    console.error("Queue error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
