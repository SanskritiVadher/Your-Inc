import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserBlindSpots } from "@/lib/review/blindSpotService";

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.blindSpotsEnabled === false) {
      return NextResponse.json({ blindSpots: [], disabled: true });
    }

    const blindSpots = await getUserBlindSpots(user.id);
    return NextResponse.json({ blindSpots, disabled: false });
  } catch (error: any) {
    console.error("Blind spots fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch blind spots" },
      { status: 500 }
    );
  }
}
