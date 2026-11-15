import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSubjectSharePrice, getSubjectCandlesticks } from "@/lib/economy/sharePrice";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const range = (searchParams.get("range") || "30D") as "7D" | "30D" | "TERM";

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!subjectId) {
      // Return list of all subjects with current price & day change
      const subjects = await prisma.subject.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          code: true,
          sharePrice: true,
          credits: true,
          ipoCelebrated: true,
        },
      });

      return NextResponse.json({ subjects });
    }

    const [calculation, candlesticks] = await Promise.all([
      calculateSubjectSharePrice(subjectId, user.id),
      getSubjectCandlesticks(subjectId, user.id, range),
    ]);

    return NextResponse.json({
      calculation,
      candlesticks,
    });
  } catch (err: unknown) {
    console.error("Share price API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compute share price" },
      { status: 500 }
    );
  }
}
