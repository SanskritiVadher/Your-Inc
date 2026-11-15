import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAdminCohortMetrics } from "@/lib/analytics/posthog";
import { getAiCostAnalytics } from "@/lib/feedback/feedbackManager";
import { getAllFeatureFlags, setFeatureFlagState } from "@/lib/flags/featureFlags";
import { generateWeek3FactualReport } from "@/lib/analytics/week3Report";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, isAdmin: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [cohortMetrics, aiCostAnalytics, featureFlags, feedbacks, users, cohorts] =
      await Promise.all([
        computeAdminCohortMetrics(),
        getAiCostAnalytics(),
        getAllFeatureFlags(),
        prisma.feedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true, email: true } } },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            creditRating: true,
            reviewsCount: true,
            createdAt: true,
            firstReviewCompletedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.cohort.findMany({
          include: {
            members: true,
            sharedDecks: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      metrics: cohortMetrics,
      aiCost: aiCostAnalytics,
      featureFlags,
      feedbacks,
      users,
      cohorts: cohorts.map((c) => ({
        id: c.id,
        name: c.name,
        program: c.program,
        year: c.year,
        inviteCode: c.inviteCode,
        memberCount: c.members.length,
        sharedDeckCount: c.sharedDecks.length,
        monthlyAiCap: c.monthlyAiCap,
      })),
    });
  } catch (err: unknown) {
    console.error("Admin GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load admin metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, isAdmin: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Toggle Runtime Feature Flag
    if (action === "toggle_flag") {
      const { key, enabled } = body;
      if (!key) return NextResponse.json({ error: "Flag key is required" }, { status: 400 });

      const updated = await setFeatureFlagState(key, Boolean(enabled));
      return NextResponse.json({ flag: updated });
    }

    // 2. Generate Week-3 Pilot Report (Empirical factual summary)
    if (action === "generate_week3_report") {
      const report = await generateWeek3FactualReport();
      return NextResponse.json({ report });
    }

    // 3. Resolve / Update Feedback Status
    if (action === "resolve_feedback") {
      const { feedbackId, status = "RESOLVED" } = body;
      if (!feedbackId) return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });

      const updated = await prisma.feedback.update({
        where: { id: feedbackId },
        data: { status },
      });

      return NextResponse.json({ feedback: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Admin POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute admin action" },
      { status: 500 }
    );
  }
}
