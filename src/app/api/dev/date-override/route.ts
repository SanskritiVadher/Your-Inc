import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeDepreciation, getEffectiveDate } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { offsetDays }: { offsetDays: number } = body;

    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "User session required" }, { status: 401 });

    // Update simulated days offset
    const currentOffset = user.simulatedDateOffsetDays || 0;
    const newOffset = offsetDays !== undefined ? offsetDays : currentOffset + 5;

    await prisma.user.update({
      where: { id: user.id },
      data: { simulatedDateOffsetDays: newOffset },
    });

    // Run depreciation recomputation with the new simulated date
    const result = await recomputeDepreciation(user.id);

    return NextResponse.json({
      success: true,
      simulatedDateOffsetDays: newOffset,
      simulatedDate: result.effectiveNow.toISOString(),
      totalValuation: result.totalValuation,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Date override failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true, simulatedDateOffsetDays: true },
    });
    if (!user) return NextResponse.json({ offsetDays: 0, effectiveDate: new Date().toISOString() });

    const effectiveDate = await getEffectiveDate(user.id);
    return NextResponse.json({
      offsetDays: user.simulatedDateOffsetDays,
      effectiveDate: effectiveDate.toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json({ offsetDays: 0, effectiveDate: new Date().toISOString() });
  }
}
