import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findFrameworksForProblem } from "@/lib/frameworks/frameworkFinderService";

export async function POST(req: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    // 1. Action: Save as note
    if (body.action === "save_note") {
      const { frameworkName, whyItFits, howToApply, limitation, subjectId, deckId, slideNumber } = body;
      
      const noteContent = [
        `Framework: ${frameworkName}`,
        "",
        `Why it fits:`,
        whyItFits,
        "",
        `How to apply:`,
        ...(Array.isArray(howToApply) ? howToApply.map((s: string) => `• ${s}`) : []),
        "",
        `Limitation to keep in mind:`,
        limitation,
        "",
        slideNumber ? `Source: Slide ${slideNumber}` : "",
      ].join("\n");

      // Find an appropriate subjectId if not provided
      let finalSubjectId = subjectId;
      if (!finalSubjectId) {
        const firstSubj = await prisma.subject.findFirst({ where: { userId: user.id } });
        finalSubjectId = firstSubj?.id;
      }

      if (!finalSubjectId) {
        return NextResponse.json({ error: "No subject available to save note" }, { status: 400 });
      }

      const note = await prisma.note.create({
        data: {
          userId: user.id,
          subjectId: finalSubjectId,
          title: `Framework Note: ${frameworkName}`,
          content: noteContent,
          tags: "framework, strategy",
        },
      });

      return NextResponse.json({ success: true, noteId: note.id });
    }

    // 2. Default: Search frameworks for problem
    const { problemDescription } = body;
    if (!problemDescription || typeof problemDescription !== "string" || !problemDescription.trim()) {
      return NextResponse.json(
        { error: "Please enter a business problem in plain words." },
        { status: 400 }
      );
    }

    const recommendations = await findFrameworksForProblem(user.id, problemDescription.trim());
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("Framework Finder error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to find frameworks" },
      { status: 500 }
    );
  }
}
