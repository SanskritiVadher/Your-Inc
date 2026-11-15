import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQuarterlyResults } from "@/lib/economy/quarterlyReport";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const archive = searchParams.get("archive") === "true";

    if (archive) {
      const reports = await prisma.quarterlyReport.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return NextResponse.json({ reports });
    }

    // Get latest report
    let latestReport = await prisma.quarterlyReport.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // If none exists, generate the initial one
    if (!latestReport) {
      const generated = await generateQuarterlyResults(user.id);
      return NextResponse.json({ report: generated });
    }

    return NextResponse.json({ report: latestReport });
  } catch (err: unknown) {
    console.error("Quarterly results API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load quarterly results" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const newReport = await generateQuarterlyResults(user.id);
    return NextResponse.json({ report: newReport });
  } catch (err: unknown) {
    console.error("Quarterly generation API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate quarterly report" },
      { status: 500 }
    );
  }
}
