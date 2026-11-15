import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioOverview } from "@/lib/economy/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getPortfolioOverview(user.id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Portfolio API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load portfolio" },
      { status: 500 }
    );
  }
}
