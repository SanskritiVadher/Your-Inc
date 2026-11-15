import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export interface BudgetCheckResult {
  allowed: boolean;
  message?: string;
  currentCostToday: number;
  dailyBudgetCost: number;
  remainingCostToday: number;
}

/**
 * Checks whether the student has exceeded their daily AI budget.
 * Standard budget: $0.50 USD per day (equivalent to ~50,000 tokens on flash models).
 */
export async function checkDailyAiBudget(userId: string): Promise<BudgetCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyAiBudgetCost: true },
  });

  const dailyBudget = user?.dailyAiBudgetCost ?? 0.50;
  const effectiveNow = await getEffectiveDate(userId);

  // Compute start of day for effective date
  const startOfDay = new Date(effectiveNow);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(effectiveNow);
  endOfDay.setHours(23, 59, 59, 999);

  // Aggregate user AI calls today
  const callsToday = await prisma.aiCall.findMany({
    where: {
      userId,
      timestamp: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: { cost: true },
  });

  const currentCostToday = callsToday.reduce((sum, c) => sum + (c.cost || 0), 0);
  const remainingCostToday = Math.max(0, dailyBudget - currentCostToday);

  if (currentCostToday >= dailyBudget) {
    return {
      allowed: false,
      message: `Daily Boardroom AI allocation reached ($${currentCostToday.toFixed(2)} / $${dailyBudget.toFixed(2)} USD). To maintain operational discipline and prevent cramming fatigue, your quota refreshes tomorrow at midnight. You can still perform unlimited flashcard reviews and offline practice.`,
      currentCostToday,
      dailyBudgetCost: dailyBudget,
      remainingCostToday: 0,
    };
  }

  return {
    allowed: true,
    currentCostToday,
    dailyBudgetCost: dailyBudget,
    remainingCostToday,
  };
}

/**
 * Logs an AI call for financial governance, security audit, and cost tracking.
 */
export async function recordAiCall(params: {
  userId?: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  feature: string;
}) {
  try {
    return await prisma.aiCall.create({
      data: {
        userId: params.userId || null,
        model: params.model,
        tokens: params.promptTokens + params.completionTokens,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        cost: params.cost,
        feature: params.feature,
      },
    });
  } catch (err) {
    console.error("Failed to log AiCall audit entry:", err);
    return null;
  }
}
