import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface QuizQuestion {
  id: string;
  newsItemId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function generateQuizQuestion(item: {
  id: string;
  title: string;
  summary: string;
  subjectCode: string | null;
  topicName: string | null;
  whyItMatters: string | null;
  gdQuestion: string | null;
  source: string;
}): QuizQuestion {
  const titleWords = item.title.split(" ");
  const shortTitle = titleWords.slice(0, 8).join(" ");
  const topic = item.topicName || "Business Economics";
  const relevance = item.whyItMatters || item.summary;

  // Question variations based on topic
  const question = `Regarding recent developments in "${shortTitle}...", what is the primary business implication for MBA strategists?`;

  const correctAnswer = relevance.length > 120 ? relevance.substring(0, 117) + "..." : relevance;

  const distractor1 = `It triggers immediate margin expansion across consumer electronics without affecting raw material costs.`;
  const distractor2 = `It strictly limits foreign institutional investments to public sector banking instruments.`;
  const distractor3 = `It mandates fixed statutory pricing guidelines for all tier-1 retail distributors.`;

  // Shuffle options deterministically
  const options = [correctAnswer, distractor1, distractor2, distractor3];
  // Simple rotation based on title length
  const shift = item.title.length % 4;
  const rotatedOptions = [...options.slice(shift), ...options.slice(0, shift)];
  const correctIndex = rotatedOptions.indexOf(correctAnswer);

  return {
    id: `q_${item.id.substring(0, 8)}`,
    newsItemId: item.id,
    question,
    options: rotatedOptions,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    explanation: `Source: ${item.source}. ${item.summary}`,
  };
}

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if an uncompleted quiz exists for this week
    const existingQuiz = await prisma.newsQuiz.findFirst({
      where: {
        userId: user.id,
        completed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingQuiz) {
      return NextResponse.json({ quiz: existingQuiz });
    }

    // Otherwise, generate a 10-question quiz
    // First source: saved items
    const saved = await prisma.savedNewsItem.findMany({
      where: { userId: user.id },
      include: { newsItem: true },
      take: 10,
      orderBy: { savedAt: "desc" },
    });

    let items = saved.map((s) => s.newsItem);

    // If fewer than 10 saved items, supplement with top news items
    if (items.length < 10) {
      const remainingNeeded = 10 - items.length;
      const existingIds = items.map((i) => i.id);
      const recent = await prisma.newsItem.findMany({
        where: {
          id: { notIn: existingIds },
        },
        take: remainingNeeded,
        orderBy: { pubDate: "desc" },
      });
      items = [...items, ...recent];
    }

    if (items.length === 0) {
      return NextResponse.json({
        quiz: null,
        message: "No news items available to generate quiz yet.",
      });
    }

    // If still fewer than 10 items, duplicate or adjust to ensure up to 10 questions
    const pool = [...items];
    while (items.length < 10 && pool.length > 0) {
      items.push(pool[items.length % pool.length]);
    }

    const questions: QuizQuestion[] = items.slice(0, 10).map((item, idx) => {
      const q = generateQuizQuestion(item);
      return { ...q, id: `q_${idx + 1}` };
    });

    const newQuiz = await prisma.newsQuiz.create({
      data: {
        userId: user.id,
        title: "Weekly Current Affairs Quiz",
        weekNumber: Math.ceil(new Date().getDate() / 7),
        questions: questions as any,
        completed: false,
      },
    });

    return NextResponse.json({ quiz: newQuiz });
  } catch (error: any) {
    console.error("[API news quiz GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load quiz" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId, answers } = body; // answers: Record<number, number> (questionIndex -> selectedOptionIndex)

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const quiz = await prisma.newsQuiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions = quiz.questions as any[] as QuizQuestion[];
    let score = 0;

    questions.forEach((q, idx) => {
      if (answers && answers[idx] === q.correctIndex) {
        score++;
      }
    });

    const updated = await prisma.newsQuiz.update({
      where: { id: quizId },
      data: {
        score,
        completed: true,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      score,
      total: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      quiz: updated,
    });
  } catch (error: any) {
    console.error("[API news quiz POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit quiz" }, { status: 500 });
  }
}
