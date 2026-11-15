import { prisma } from "@/lib/prisma";

export interface SubmitFeedbackInput {
  userId?: string;
  type: "BUG" | "FEATURE" | "CONFUSING" | "PRAISE" | "AI_RATING" | "EXAM_SURVEY";
  content: string;
  aiRating?: boolean;
  ratingReason?: string;
  contextUrl?: string;
  browser?: string;
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  return await prisma.feedback.create({
    data: {
      userId: input.userId || null,
      type: input.type,
      content: input.content.trim(),
      aiRating: input.aiRating !== undefined ? input.aiRating : null,
      ratingReason: input.ratingReason ? input.ratingReason.trim() : null,
      contextUrl: input.contextUrl || null,
      browser: input.browser || null,
      status: "NEW",
    },
  });
}

/**
 * Checks if user should be prompted with the 3rd review exam question:
 * "What would make you open this before an exam?"
 */
export async function shouldPromptExamSurvey(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reviewsCount: true },
  });

  if (!user || user.reviewsCount < 3) return false;

  // Check if student already answered the survey
  const existingSurvey = await prisma.feedback.findFirst({
    where: {
      userId,
      type: "EXAM_SURVEY",
    },
  });

  return !existingSurvey;
}

/**
 * Records an AI model call and audits spending against daily and cohort budgets.
 */
export async function recordAndAuditAiUsage(
  userId: string,
  model: string,
  tokens: number,
  cost: number,
  feature: string
): Promise<{
  allowed: boolean;
  userBudgetExceeded: boolean;
  cohortAlert80: boolean;
  cohortCapExceeded: boolean;
}> {
  // 1. Record AiCall in audit ledger
  await prisma.aiCall.create({
    data: {
      userId,
      model,
      tokens,
      cost,
      feature,
    },
  });

  // 2. Audit student daily spending
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyCalls = await prisma.aiCall.findMany({
    where: {
      userId,
      timestamp: { gte: today },
    },
    select: { cost: true },
  });

  const dailyTotal = dailyCalls.reduce((sum, c) => sum + c.cost, 0);
  const userBudgetExceeded = dailyTotal > 0.50; // $0.50 daily cap

  // 3. Audit cohort monthly cap
  let cohortAlert80 = false;
  let cohortCapExceeded = false;

  const member = await prisma.cohortMember.findFirst({
    where: { userId },
    include: { cohort: true },
  });

  if (member?.cohort) {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const cohortMembers = await prisma.cohortMember.findMany({
      where: { cohortId: member.cohortId },
      select: { userId: true },
    });

    const cohortUserIds = cohortMembers.map((m) => m.userId);
    const monthlyCohortCalls = await prisma.aiCall.findMany({
      where: {
        userId: { in: cohortUserIds },
        timestamp: { gte: firstOfMonth },
      },
      select: { cost: true },
    });

    const monthlyTotal = monthlyCohortCalls.reduce((sum, c) => sum + c.cost, 0);
    const cap = member.cohort.monthlyAiCap || 50.0;

    cohortAlert80 = monthlyTotal >= 0.80 * cap;
    cohortCapExceeded = monthlyTotal >= cap;
  }

  return {
    allowed: !userBudgetExceeded && !cohortCapExceeded,
    userBudgetExceeded,
    cohortAlert80,
    cohortCapExceeded,
  };
}

/**
 * Computes AI Cost analytics by user and by feature for the Admin dashboard.
 */
export async function getAiCostAnalytics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const calls = await prisma.aiCall.findMany({
    where: { timestamp: { gte: thirtyDaysAgo } },
    select: { userId: true, cost: true, feature: true, model: true },
  });

  const totalCost = calls.reduce((sum, c) => sum + c.cost, 0);

  // Group by feature
  const featureCostMap: Record<string, number> = {};
  for (const c of calls) {
    featureCostMap[c.feature] = (featureCostMap[c.feature] || 0) + c.cost;
  }

  const costByFeature = Object.entries(featureCostMap).map(([feature, cost]) => ({
    feature,
    cost: Number(cost.toFixed(3)),
  }));

  // Unique users who incurred AI costs
  const userIds = new Set(calls.map((c) => c.userId).filter(Boolean));
  const costPerActiveUser =
    userIds.size > 0 ? Number((totalCost / userIds.size).toFixed(3)) : 0;

  return {
    total30DayCost: Number(totalCost.toFixed(2)),
    costPerActiveUser,
    activeAiUserCount: userIds.size,
    costByFeature,
  };
}
