import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getApiCurrentUser({ allowUnonboarded: true });

    if (!user) {
      return NextResponse.json({ user: null, onboardingNeeded: true });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!fullUser) {
      return NextResponse.json({ user: null, onboardingNeeded: true });
    }

    return NextResponse.json({ user: fullUser, onboardingNeeded: !fullUser.onboardingCompleted });
  } catch (err: unknown) {
    console.error("Fetch user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
