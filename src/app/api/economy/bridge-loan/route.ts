import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyBridgeLoanSkip, getCreditAndLoanStatus } from "@/lib/economy/creditRating";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = await getCreditAndLoanStatus(user.id);
    return NextResponse.json({
      freeSkipsUsed: status.freeSkipsUsed,
      freeSkipsRemaining: status.freeSkipsRemaining,
      borrowedSkips: status.borrowedSkips,
      loans: status.monthLoans,
    });
  } catch (err: unknown) {
    console.error("Bridge loan fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load bridge loan status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await applyBridgeLoanSkip(
      user.id,
      undefined,
      reason || "Strategic pause & personal study recalibration"
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: result.isFree
        ? `Bridge loan skip #${result.skipNumberThisMonth} applied. Free skip used (0 penalty, credit rating protected).`
        : `Bridge loan skip #${result.skipNumberThisMonth} applied. Borrowed skip with ₹${result.penaltyApplied.toFixed(2)} grace charge; credit rating remains protected.`,
    });
  } catch (err: unknown) {
    console.error("Bridge loan application error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to apply bridge loan" },
      { status: 500 }
    );
  }
}
