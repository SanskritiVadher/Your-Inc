import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ plans: [] });

    const plans = await prisma.examPlan.findMany({
      where: { userId: user.id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            evaluationComponents: true,
          },
        },
      },
      orderBy: { examDate: "asc" },
    });

    return NextResponse.json({ plans });
  } catch (err: unknown) {
    console.error("Exam plan fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subjectId, examDate, scopeDeckIds } = body;

    if (!subjectId || !examDate) {
      return NextResponse.json(
        { error: "Subject ID and Exam Date are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const effectiveNow = await getEffectiveDate(user.id);
    const targetDate = new Date(examDate);

    const diffMs = targetDate.getTime() - effectiveNow.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Retrieve subject concepts and evaluation weights
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        evaluationComponents: true,
        concepts: {
          include: { cards: true },
        },
        decks: {
          where: scopeDeckIds?.length ? { id: { in: scopeDeckIds } } : {},
          include: {
            slides: {
              include: { questions: true },
            },
          },
        },
      },
    });

    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    // Calculate priority score for each concept: (100 - value) * component weight
    const highestWeightComponent = subject.evaluationComponents.reduce(
      (max, c) => (c.weight > max ? c.weight : max),
      20
    );

    const prioritizedConcepts = subject.concepts.map((concept) => {
      const deficiency = Math.max(0, 100 - concept.value);
      const score = deficiency * highestWeightComponent;
      return {
        id: concept.id,
        name: concept.name,
        value: concept.value,
        cardCount: concept.cards.length,
        priorityScore: score,
      };
    });

    prioritizedConcepts.sort((a, b) => b.priorityScore - a.priorityScore);

    // Assemble mock exam questions from scoped decks
    const allQuestions: { id: string; text: string; type: string; difficulty: string | null; deckTitle: string }[] = [];
    for (const deck of subject.decks) {
      for (const slide of deck.slides) {
        for (const q of slide.questions) {
          allQuestions.push({
            id: q.id,
            text: q.text,
            type: q.type,
            difficulty: q.difficulty || null,
            deckTitle: deck.title,
          });
        }
      }
    }

    // Schedule day-by-day plan
    const daysPlan = [];
    const mockPaperDayIndex = Math.max(1, diffDays - 2); // exactly 2 days before exam date

    for (let day = 1; day <= diffDays; day++) {
      const planCalendarDate = new Date(effectiveNow);
      planCalendarDate.setDate(planCalendarDate.getDate() + day);

      const isMockDay = day === mockPaperDayIndex;
      const isEveOfExam = day === diffDays - 1;
      const isExamDay = day === diffDays;

      let dailyFocus = "Targeted Asset Reinvestment";
      let reviewCardCount = 20;
      let coldCallConcept = prioritizedConcepts[(day - 1) % Math.max(prioritizedConcepts.length, 1)]?.name || null;
      let hasMockPaper = false;

      if (isExamDay) {
        dailyFocus = "Final Examination Day • Walk into Exam Fully Capitalized";
        reviewCardCount = 0;
        coldCallConcept = null;
      } else if (isEveOfExam) {
        dailyFocus = "Solvency Watch • Light Refresher on High-Yield Formulas";
        reviewCardCount = 10;
        coldCallConcept = null;
      } else if (isMockDay) {
        dailyFocus = "Full Timed Mock Examination & Answer Grader Audit";
        reviewCardCount = 10;
        hasMockPaper = true;
      } else {
        reviewCardCount = Math.min(35, 15 + Math.round(prioritizedConcepts.length * 1.5));
      }

      daysPlan.push({
        dayNumber: day,
        date: planCalendarDate.toISOString(),
        formattedDate: planCalendarDate.toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        focus: dailyFocus,
        targetCards: reviewCardCount,
        coldCallFocus: coldCallConcept,
        isMockPaperScheduled: hasMockPaper,
        isEveOfExam,
        isExamDay,
        completed: false,
      });
    }

    // Upsert or create new ExamPlan
    const plan = await prisma.examPlan.create({
      data: {
        userId: user.id,
        subjectId,
        examDate: targetDate,
        scopeDeckIds: scopeDeckIds || [],
        daysPlan,
        status: "ACTIVE",
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      plan,
      mockQuestionsAvailable: allQuestions.slice(0, 10),
    });
  } catch (err: unknown) {
    console.error("Exam plan creation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create exam plan" },
      { status: 500 }
    );
  }
}
