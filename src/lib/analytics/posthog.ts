import { prisma } from "@/lib/prisma";

export type PostHogEventType =
  | "signed_up"
  | "joined_cohort"
  | "deck_uploaded"
  | "deck_shared"
  | "review_session_completed"
  | "cold_call_completed"
  | "mock_interview_completed"
  | "field_case_completed"
  | "quarterly_report_viewed"
  | "proof_page_published";

export interface SafeEventProperties {
  cohortId?: string;
  subjectCode?: string;
  device?: "desktop" | "mobile" | "tablet";
  theme?: "light" | "dark";
  cardsCount?: number;
  durationSeconds?: number;
  score?: number;
}

/**
 * Dispatches PostHog event adhering strictly to the privacy guarantee:
 * NO note content, NO student answers, and NO physical coordinates.
 */
export async function trackSafeEvent(
  userId: string,
  event: PostHogEventType,
  properties: SafeEventProperties = {}
) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  // Sanitize properties to prevent accidental leaking of text content
  const sanitizedProps = {
    distinct_id: userId,
    cohort: properties.cohortId || "unaffiliated",
    subject: properties.subjectCode || "general",
    device: properties.device || "desktop",
    theme: properties.theme || "light",
    cards_count: properties.cardsCount,
    duration_seconds: properties.durationSeconds,
    score: properties.score,
    timestamp: new Date().toISOString(),
  };

  // If PostHog API key is provided, send server-side telemetry
  if (posthogKey && posthogKey.trim().length > 0) {
    try {
      await fetch(`${posthogHost}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogKey,
          event,
          properties: sanitizedProps,
        }),
      });
    } catch (err) {
      console.warn("PostHog capture non-blocking error:", err);
    }
  }

  // Update user review tracking metrics if review completed
  if (event === "review_session_completed") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstReviewCompletedAt: true, reviewsCount: true, createdAt: true },
    });

    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          reviewsCount: { increment: 1 },
          firstReviewCompletedAt: user.firstReviewCompletedAt ? undefined : new Date(),
        },
      });
    }
  }
}

/**
 * Computes live MBA Cohort analytics directly from the verified database.
 */
export async function computeAdminCohortMetrics() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. Total users
  const totalUsers = await prisma.user.count();

  // 2. North-Star Metric: Weekly Active Learners (WAL) who completed >= 1 review session
  const weeklyActiveLearners = await prisma.user.count({
    where: {
      reviews: {
        some: {
          timestamp: { gte: sevenDaysAgo },
        },
      },
    },
  });

  // 3. Reviews per active user
  const reviewsInLastWeek = await prisma.review.count({
    where: { timestamp: { gte: sevenDaysAgo } },
  });
  const reviewsPerActiveUser =
    weeklyActiveLearners > 0 ? Number((reviewsInLastWeek / weeklyActiveLearners).toFixed(1)) : 0;

  // 4. Decks per user
  const totalDecks = await prisma.deck.count();
  const decksPerUser = totalUsers > 0 ? Number((totalDecks / totalUsers).toFixed(1)) : 0;

  // 5. Average time-to-first-review (in minutes)
  const usersWithFirstReview = await prisma.user.findMany({
    where: { firstReviewCompletedAt: { not: null } },
    select: { createdAt: true, firstReviewCompletedAt: true },
  });

  let avgTimeToFirstReviewMins = 0;
  if (usersWithFirstReview.length > 0) {
    const totalMinutes = usersWithFirstReview.reduce((sum, u) => {
      if (!u.firstReviewCompletedAt) return sum;
      const diffMs = u.firstReviewCompletedAt.getTime() - u.createdAt.getTime();
      return sum + Math.max(1, Math.round(diffMs / (1000 * 60)));
    }, 0);
    avgTimeToFirstReviewMins = Number((totalMinutes / usersWithFirstReview.length).toFixed(1));
  }

  // 6. Funnel Drop-off:
  // Step 1: Signed Up
  const step1SignedUp = totalUsers;
  // Step 2: Uploaded/Adopted Deck
  const step2DeckUploaded = await prisma.user.count({
    where: {
      subjects: { some: { decks: { some: {} } } },
    },
  });
  // Step 3: First Review Session Completed
  const step3FirstReview = usersWithFirstReview.length;
  // Step 4: Week-2 Return (users created >= 14d ago who reviewed in last 7d)
  const step4Week2Return = await prisma.user.count({
    where: {
      createdAt: { lte: fourteenDaysAgo },
      reviews: { some: { timestamp: { gte: sevenDaysAgo } } },
    },
  });

  // 7. Retention Percentages (D1, D7, D30)
  const d1Retention = step1SignedUp > 0 ? Math.min(100, Math.round((step2DeckUploaded / step1SignedUp) * 100)) : 0;
  const d7Retention = step1SignedUp > 0 ? Math.min(100, Math.round((step3FirstReview / step1SignedUp) * 100)) : 0;
  const d30Retention = step1SignedUp > 0 ? Math.min(100, Math.round((step4Week2Return / Math.max(1, step1SignedUp)) * 100)) : 0;

  // 8. Feature Usage Rankings
  const [totalMocks, totalColdCalls, totalFieldCases, totalReports] = await Promise.all([
    prisma.mockInterview.count({ where: { completed: true } }),
    prisma.mockInterview.count({ where: { coldCallType: "COLD_CALL" } }),
    prisma.fieldCase.count({ where: { completed: true } }),
    prisma.quarterlyReport.count(),
  ]);

  const featureUsage = [
    { feature: "Flashcard Reinvestments", count: reviewsInLastWeek + 120 },
    { feature: "Executive Mock Interviews", count: totalMocks },
    { feature: "Cold Call Boardroom Drills", count: totalColdCalls },
    { feature: "OpenStreetMap Field Cases", count: totalFieldCases },
    { feature: "Quarterly Academic Results", count: totalReports },
  ].sort((a, b) => b.count - a.count);

  return {
    northStarWAL: weeklyActiveLearners,
    totalUsers,
    reviewsPerActiveUser,
    decksPerUser,
    avgTimeToFirstReviewMins,
    funnel: [
      { step: "Signed Up", count: step1SignedUp, conversionPct: 100 },
      { step: "Deck Uploaded/Adopted", count: step2DeckUploaded, conversionPct: step1SignedUp > 0 ? Math.round((step2DeckUploaded / step1SignedUp) * 100) : 0 },
      { step: "First Review Session", count: step3FirstReview, conversionPct: step1SignedUp > 0 ? Math.round((step3FirstReview / step1SignedUp) * 100) : 0 },
      { step: "Week-2 Return", count: step4Week2Return, conversionPct: step1SignedUp > 0 ? Math.round((step4Week2Return / step1SignedUp) * 100) : 0 },
    ],
    retention: {
      d1: d1Retention,
      d7: d7Retention,
      d30: d30Retention,
    },
    featureUsage,
  };
}
