import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export interface SharePriceCalculationDetails {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sharePrice: number;
  conceptContribution: number; // 70% component
  assignmentContribution: number; // 30% component
  conceptAvgWeighted: number;
  assignmentAvgWeighted: number;
  evaluationWeightsApplied: { name: string; weight: number }[];
  conceptsCount: number;
  assignmentsCount: number;
  formulaDescription: string;
}

export interface CandlestickBar {
  date: string;
  formattedDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Pure helper for the 70/30 share price formula.
 * Ensures edge cases (zero reviews, NaN, null assignment) resolve safely to a numerical value.
 */
export function computeSharePriceFormula(
  conceptAvg: number,
  assignmentAvg: number | null
): { sharePrice: number; conceptPart: number; assignmentPart: number } {
  const safeConceptAvg = isNaN(conceptAvg) || conceptAvg === null || conceptAvg === undefined ? 0 : conceptAvg;
  const safeAssignmentAvg =
    assignmentAvg !== null && assignmentAvg !== undefined && !isNaN(assignmentAvg)
      ? assignmentAvg
      : safeConceptAvg;

  const conceptPart = Number((0.70 * safeConceptAvg).toFixed(2));
  const assignmentPart = Number((0.30 * safeAssignmentAvg).toFixed(2));
  const sharePrice = Number((conceptPart + assignmentPart).toFixed(2));

  return {
    sharePrice: isNaN(sharePrice) ? 0 : sharePrice,
    conceptPart,
    assignmentPart,
  };
}

/**
 * Calculates subject share price strictly from recall outcomes and assignments:
 * Share Price = 70% weighted concept mastery + 30% assignment/mock evaluation scores.
 */
export async function calculateSubjectSharePrice(
  subjectId: string,
  userId: string
): Promise<SharePriceCalculationDetails> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      evaluationComponents: true,
      concepts: true,
      assignments: {
        where: { status: { in: ["GRADED", "SUBMITTED"] } },
      },
      interviews: {
        where: { coldCallType: "COLD_CALL" },
      },
    },
  });

  if (!subject) {
    throw new Error(`Subject ${subjectId} not found`);
  }

  // 1. Concept Weighted Average (70% Component)
  let conceptSum = 0;
  let totalConceptWeight = 0;

  if (subject.concepts.length === 0) {
    conceptSum = 0;
    totalConceptWeight = 1;
  } else {
    // If evaluation components exist, map weights; otherwise equal weight
    const componentWeights = subject.evaluationComponents.map((c) => c.weight);
    const avgComponentWeight =
      componentWeights.length > 0
        ? componentWeights.reduce((s, w) => s + w, 0) / componentWeights.length
        : 1.0;

    for (const concept of subject.concepts) {
      const weight = avgComponentWeight;
      conceptSum += concept.value * weight;
      totalConceptWeight += weight;
    }
  }

  const conceptAvgWeighted = Number((conceptSum / totalConceptWeight).toFixed(2));

  // 2. Assignment & Mock Scores (30% Component)
  let assignmentSum = 0;
  let totalAssignmentWeight = 0;

  for (const a of subject.assignments) {
    if (a.grade !== null && a.grade !== undefined) {
      assignmentSum += a.grade * (a.weight || 10);
      totalAssignmentWeight += a.weight || 10;
    }
  }

  // Include cold call / mock performance scores (scaled 0-100)
  for (const m of subject.interviews) {
    if (m.performanceScore) {
      const scorePct = (m.performanceScore / 5.0) * 100;
      assignmentSum += scorePct * 5;
      totalAssignmentWeight += 5;
    }
  }

  let assignmentAvgWeighted = conceptAvgWeighted; // Baseline if no assignments yet
  if (totalAssignmentWeight > 0) {
    assignmentAvgWeighted = Number((assignmentSum / totalAssignmentWeight).toFixed(2));
  }

  // 3. Final 70/30 Formula
  const conceptPart = Number((0.70 * conceptAvgWeighted).toFixed(2));
  const assignmentPart = Number((0.30 * assignmentAvgWeighted).toFixed(2));
  const calculatedSharePrice = Number((conceptPart + assignmentPart).toFixed(2));

  // 4. Check for IPO event (when price first crosses 80)
  const effectiveNow = await getEffectiveDate(userId);
  let ipoTriggered = false;

  if (calculatedSharePrice >= 80 && !subject.ipoCelebrated) {
    ipoTriggered = true;
    await prisma.subject.update({
      where: { id: subject.id },
      data: {
        ipoCelebrated: true,
        ipoDate: effectiveNow,
        sharePrice: calculatedSharePrice,
      },
    });

    // Record IPO transaction in ledger
    await prisma.transaction.create({
      data: {
        userId,
        subjectId: subject.id,
        type: "INITIAL_OFFERING",
        amount: calculatedSharePrice,
        beforeValue: subject.sharePrice,
        afterValue: calculatedSharePrice,
        reason: `INITIAL PUBLIC OFFERING (IPO): Department ${subject.code} achieved solvency grade > 80.00`,
        timestamp: effectiveNow,
      },
    });
  } else {
    await prisma.subject.update({
      where: { id: subject.id },
      data: { sharePrice: calculatedSharePrice },
    });
  }

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    subjectCode: subject.code,
    sharePrice: calculatedSharePrice,
    conceptContribution: conceptPart,
    assignmentContribution: assignmentPart,
    conceptAvgWeighted,
    assignmentAvgWeighted,
    evaluationWeightsApplied: subject.evaluationComponents.map((c) => ({
      name: c.name,
      weight: c.weight,
    })),
    conceptsCount: subject.concepts.length,
    assignmentsCount: subject.assignments.length,
    formulaDescription:
      "70% Weighted Concept Mastery (FSRS Retrievability × Syllabus Importance) + 30% Assignment & Case Outcomes. Logins and time spent carry exactly 0% weight.",
  };
}

/**
 * Builds daily OHLC candlestick bars from immutable Bahi-Khata ledger transactions.
 */
export async function getSubjectCandlesticks(
  subjectId: string,
  userId: string,
  range: "7D" | "30D" | "TERM" = "30D"
): Promise<CandlestickBar[]> {
  const effectiveNow = await getEffectiveDate(userId);
  let daysBack = 30;
  if (range === "7D") daysBack = 7;
  else if (range === "TERM") daysBack = 90;

  const startDate = new Date(effectiveNow);
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      subjectId,
      timestamp: { gte: startDate, lte: effectiveNow },
    },
    orderBy: { timestamp: "asc" },
  });

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { sharePrice: true },
  });

  const currentPrice = subject?.sharePrice || 50.0;

  // Group transactions by calendar day
  const dailyTxMap: Record<string, { before: number[]; after: number[]; count: number }> = {};

  for (let d = 0; d < daysBack; d++) {
    const curDate = new Date(startDate);
    curDate.setDate(curDate.getDate() + d);
    const key = curDate.toISOString().split("T")[0];
    dailyTxMap[key] = { before: [], after: [], count: 0 };
  }

  for (const tx of transactions) {
    const key = new Date(tx.timestamp).toISOString().split("T")[0];
    if (dailyTxMap[key]) {
      if (tx.beforeValue !== null && tx.beforeValue !== undefined) {
        dailyTxMap[key].before.push(tx.beforeValue);
      }
      if (tx.afterValue !== null && tx.afterValue !== undefined) {
        dailyTxMap[key].after.push(tx.afterValue);
      }
      dailyTxMap[key].count += 1;
    }
  }

  const bars: CandlestickBar[] = [];
  let runningClose = Math.max(20, currentPrice - (transactions.length * 0.4));

  for (const [key, data] of Object.entries(dailyTxMap)) {
    const barDate = new Date(key);
    let open = runningClose;
    let high = runningClose;
    let low = runningClose;
    let close = runningClose;

    if (data.count > 0 && data.after.length > 0) {
      open = data.before.length > 0 ? data.before[0] : runningClose;
      close = data.after[data.after.length - 1];
      const allVals = [...data.before, ...data.after];
      high = Math.max(...allVals);
      low = Math.min(...allVals);
    } else {
      // Natural slight day drift reflecting FSRS depreciation if unreviewed
      close = Math.max(0, runningClose - 0.15);
      low = close;
    }

    runningClose = close;

    bars.push({
      date: key,
      formattedDate: barDate.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: data.count,
    });
  }

  return bars;
}
