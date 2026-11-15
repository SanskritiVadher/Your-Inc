import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId") || "user_local_dev_ceo";

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkId },
          { onboardingCompleted: true },
        ],
      },
      include: {
        subjects: {
          include: {
            professor: true,
          },
          orderBy: { createdAt: "asc" },
        },
        terms: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null, onboardingNeeded: true });
    }

    return NextResponse.json({ user, onboardingNeeded: !user.onboardingCompleted });
  } catch (err: unknown) {
    console.error("Fetch user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
