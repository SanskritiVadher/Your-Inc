import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCreditAndLoanStatus,
  downgradeCreditRating,
  upgradeCreditRating,
} from "@/lib/economy/creditRating";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = await getCreditAndLoanStatus(user.id);
    return NextResponse.json(status);
  } catch (err: unknown) {
    console.error("Credit rating API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load credit rating status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, reason } = body; // action: "downgrade" | "upgrade"

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "downgrade") {
      const result = await downgradeCreditRating(
        user.id,
        reason || "Missed assignment submission deadline"
      );
      return NextResponse.json({ success: true, ...result });
    } else if (action === "upgrade") {
      const result = await upgradeCreditRating(
        user.id,
        reason || "7 consecutive clean days of on-time submissions and completed reviews"
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid credit action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Credit rating mutation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to adjust credit rating" },
      { status: 500 }
    );
  }
}
