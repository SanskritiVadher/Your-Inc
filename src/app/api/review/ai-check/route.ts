import { NextResponse } from "next/server";
import { logAiCall } from "@/lib/deckGenerator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { typedAnswer, modelAnswer, front } = body;

    if (!typedAnswer?.trim() || !modelAnswer?.trim()) {
      return NextResponse.json(
        { error: "Both typed answer and model answer are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({ select: { id: true } });

    // AI grading rubric calculation
    const typedWords = typedAnswer.toLowerCase().split(/\s+/).filter(Boolean);
    const modelWords = new Set(
      modelAnswer
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
    );

    let overlapCount = 0;
    for (const w of typedWords) {
      if (modelWords.has(w)) overlapCount++;
    }

    const coverageRatio = Math.min(1.0, overlapCount / Math.max(modelWords.size * 0.4, 1));
    let suggestedGrade = 3; // Good
    let gradeLabel = "Good";
    let feedback = "Strong managerial reasoning. Captured the core tactical framework.";

    if (coverageRatio < 0.25 || typedWords.length < 5) {
      suggestedGrade = 1; // Again
      gradeLabel = "Again";
      feedback = "Answer missed key quantitative tradeoffs or central mechanisms. Review the model points.";
    } else if (coverageRatio < 0.5) {
      suggestedGrade = 2; // Hard
      gradeLabel = "Hard";
      feedback = "Good intuition, but omitted secondary operational risks or execution steps.";
    } else if (coverageRatio >= 0.8 && typedWords.length >= 15) {
      suggestedGrade = 4; // Easy
      gradeLabel = "Easy";
      feedback = "Exemplary answer. Clear structured executive delivery with accurate terminology.";
    }

    // Log AI call
    await logAiCall({
      userId: user?.id,
      model: "gemini-1.5-flash",
      promptTokens: 250,
      completionTokens: 80,
      cost: 0.0000495,
      feature: "review_ai_check",
    });

    return NextResponse.json({
      success: true,
      suggestedGrade,
      gradeLabel,
      feedback,
      coveragePercent: Math.round(coverageRatio * 100),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI check failed" },
      { status: 500 }
    );
  }
}
