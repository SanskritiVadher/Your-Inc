import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrGenerateMorningBrief } from "@/lib/planner/morningBrief";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const brief = await getOrGenerateMorningBrief(user.id);
    return NextResponse.json({ brief });
  } catch (err: unknown) {
    console.error("Morning Brief API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load morning brief" },
      { status: 500 }
    );
  }
}
