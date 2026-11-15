import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCandidateTopicForConfidence,
  recordTopicConfidence,
  ConfidenceLevel,
} from "@/lib/review/blindSpotService";

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.blindSpotsEnabled === false) {
      return NextResponse.json({ candidate: null, disabled: true });
    }

    const candidate = await getCandidateTopicForConfidence(user.id);
    return NextResponse.json({ candidate, disabled: false });
  } catch (error: any) {
    console.error("Confidence candidate error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get confidence topic" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { conceptId, confidence } = await req.json();
    if (!conceptId || !confidence) {
      return NextResponse.json({ error: "Missing conceptId or confidence" }, { status: 400 });
    }

    const validLevels: ConfidenceLevel[] = ["not_sure", "fairly_sure", "very_sure"];
    if (!validLevels.includes(confidence)) {
      return NextResponse.json({ error: "Invalid confidence level" }, { status: 400 });
    }

    await recordTopicConfidence(user.id, conceptId, confidence);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Record confidence error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record confidence" },
      { status: 500 }
    );
  }
}
