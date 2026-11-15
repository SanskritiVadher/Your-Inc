import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractMeetingDecisionsAndActions,
  convertActionItemsToTasks,
} from "@/lib/planner/groupProjects";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, groupProjectId, rawContent, title, actionItems } = body;

    if (!groupProjectId) {
      return NextResponse.json({ error: "Missing groupProjectId" }, { status: 400 });
    }

    // 1. Extract Preview
    if (action === "extract") {
      const members = await prisma.groupMember.findMany({
        where: { groupProjectId },
        select: { id: true, name: true, email: true },
      });

      const extracted = extractMeetingDecisionsAndActions(rawContent || "", members);
      return NextResponse.json({ extracted });
    }

    // 2. Save Meeting Note & Convert Confirmed Actions to Tasks
    if (action === "save_and_convert") {
      const { decisions, actionItems: confirmedActions, openQuestions } = body;

      const meetingNote = await prisma.meetingNote.create({
        data: {
          groupProjectId,
          userId: user.id,
          title: title || "Team Syndicate Meeting Minutes",
          rawContent: rawContent || "",
          decisions: decisions || [],
          actionItems: confirmedActions || [],
          openQuestions: openQuestions || [],
        },
      });

      // Convert confirmed action items into project tasks
      let createdTasks: unknown[] = [];
      if (Array.isArray(confirmedActions) && confirmedActions.length > 0) {
        createdTasks = await convertActionItemsToTasks(
          groupProjectId,
          user.id,
          confirmedActions
        );
      }

      return NextResponse.json({
        meetingNote,
        createdTasksCount: createdTasks.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Meeting Notes API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process meeting notes" },
      { status: 500 }
    );
  }
}
