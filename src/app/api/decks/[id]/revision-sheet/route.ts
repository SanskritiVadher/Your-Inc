import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateRevisionSheet } from "@/lib/revision/revisionSheetService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    if (!deckId) {
      return NextResponse.json({ error: "Missing deck id" }, { status: 400 });
    }

    const sheet = await getOrGenerateRevisionSheet(deckId);
    return NextResponse.json({ sheet });
  } catch (error: any) {
    console.error("Error generating revision sheet:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load revision sheet" },
      { status: 500 }
    );
  }
}
