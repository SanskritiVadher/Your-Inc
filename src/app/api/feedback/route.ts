import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  submitFeedback,
  shouldPromptExamSurvey,
} from "@/lib/feedback/feedbackManager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ shouldPrompt: false });

    const shouldPrompt = await shouldPromptExamSurvey(user.id);
    return NextResponse.json({ shouldPrompt });
  } catch (err: unknown) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ shouldPrompt: false });
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    const body = await req.json();
    const { type, content, aiRating, ratingReason, contextUrl, browser } = body;

    if (!type || !content?.trim()) {
      return NextResponse.json({ error: "Type and content are required" }, { status: 400 });
    }

    const feedback = await submitFeedback({
      userId: user?.id,
      type,
      content,
      aiRating,
      ratingReason,
      contextUrl,
      browser,
    });

    return NextResponse.json({ feedback });
  } catch (err: unknown) {
    console.error("Feedback POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
