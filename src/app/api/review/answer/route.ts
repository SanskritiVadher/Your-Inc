import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeCardReview } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cardId, grade }: { cardId: string; grade: number } = body;

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!cardId || ![1, 2, 3, 4].includes(grade)) {
      return NextResponse.json(
        { error: "Valid cardId and grade (1: Again, 2: Hard, 3: Good, 4: Easy) are required" },
        { status: 400 }
      );
    }

    const result = await executeCardReview({
      cardId,
      grade: grade as 1 | 2 | 3 | 4,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Answer submission error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record review" },
      { status: 500 }
    );
  }
}
