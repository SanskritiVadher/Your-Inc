import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateInterviewQuestion,
  generateInterviewerFollowUp,
  evaluateMockInterview,
} from "@/lib/career/interviewRoom";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const interviews = await prisma.mockInterview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    // Score trends by mode
    const modeTrends: Record<string, { count: number; averageScore: number }> = {
      PM: { count: 0, averageScore: 0 },
      CONSULTING: { count: 0, averageScore: 0 },
      MARKETING: { count: 0, averageScore: 0 },
      BEHAVIOURAL: { count: 0, averageScore: 0 },
    };

    for (const m of interviews) {
      if (m.completed && modeTrends[m.mode]) {
        modeTrends[m.mode].count += 1;
        modeTrends[m.mode].averageScore += m.performanceScore;
      }
    }

    for (const modeKey of Object.keys(modeTrends)) {
      if (modeTrends[modeKey].count > 0) {
        modeTrends[modeKey].averageScore = Number(
          (modeTrends[modeKey].averageScore / modeTrends[modeKey].count).toFixed(1)
        );
      }
    }

    return NextResponse.json({
      interviews,
      modeTrends,
    });
  } catch (err: unknown) {
    console.error("Interviews GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load interviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // 1. Start a new Mock Interview Drill
    if (action === "start") {
      const mode = (body.mode || "PM") as "PM" | "CONSULTING" | "MARKETING" | "BEHAVIOURAL";
      const roleTargeted = body.roleTargeted || "Product Manager";
      const companyTargeted = body.companyTargeted || "Target Company";

      const generated = await generateInterviewQuestion(user.id, mode, roleTargeted, companyTargeted);

      const interview = await prisma.mockInterview.create({
        data: {
          userId: user.id,
          mode,
          roleTargeted,
          companyTargeted,
          conceptId: generated.conceptId || null,
          question: generated.question,
          completed: false,
          transcript: [
            {
              speaker: "interviewer",
              message: generated.question,
              timestamp: new Date().toISOString(),
            },
          ] as unknown as object,
        },
      });

      return NextResponse.json({
        interview,
        contextNote: generated.contextNote,
      });
    }

    // 2. Next Multi-Turn Interaction (Student Answer + Interviewer Pushback)
    if (action === "turn") {
      const { interviewId, studentAnswer, currentTranscript } = body;
      if (!interviewId || !studentAnswer?.trim()) {
        return NextResponse.json({ error: "Missing interview response" }, { status: 400 });
      }

      const interview = await prisma.mockInterview.findUnique({
        where: { id: interviewId },
      });
      if (!interview) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      const transcript = Array.isArray(currentTranscript) ? [...currentTranscript] : [];
      transcript.push({
        speaker: "student",
        message: studentAnswer.trim(),
        timestamp: new Date().toISOString(),
      });

      const studentTurnCount = transcript.filter((t) => t.speaker === "student").length;
      const followUp = generateInterviewerFollowUp(interview.mode, studentTurnCount, studentAnswer);

      transcript.push({
        speaker: "interviewer",
        message: followUp,
        timestamp: new Date().toISOString(),
      });

      // Update transcript in DB
      await prisma.mockInterview.update({
        where: { id: interviewId },
        data: { transcript: transcript as unknown as object },
      });

      return NextResponse.json({
        transcript,
        isWrapUp: studentTurnCount >= 3,
      });
    }

    // 3. Final Evaluation & Executive Scorecard
    if (action === "evaluate") {
      const { interviewId, transcript } = body;
      if (!interviewId || !Array.isArray(transcript)) {
        return NextResponse.json({ error: "Missing transcript for evaluation" }, { status: 400 });
      }

      const scorecard = await evaluateMockInterview(interviewId, user.id, transcript);
      return NextResponse.json(scorecard);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Interviews POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process interview action" },
      { status: 500 }
    );
  }
}
