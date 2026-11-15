import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get("conceptId");
    const subjectId = searchParams.get("subjectId");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ transactions: [] });

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        ...(conceptId ? { conceptId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        concept: { select: { id: true, name: true, value: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ transactions });
  } catch (err: unknown) {
    console.error("Fetch transactions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
