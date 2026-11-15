import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getEffectiveDate, calculateRetrievability } from "@/lib/fsrs";

export interface CeoLetter {
  wentWell: string;
  slipping: string;
  oneThingToDo: string;
  [key: string]: string;
}

export interface GeneratedQuarterlyReport {
  id: string;
  startDate: string;
  endDate: string;
  revenueGained: number;
  depreciationLoss: number;
  netValueChange: number;
  bestDepartment: string;
  worstDepartment: string;
  creditRating: string;
  creditRatingDelta: string;
  conceptsAtRisk: { name: string; subjectCode: string; currentValue: number; projected7d: number }[];
  ceoLetter: CeoLetter;
}

/**
 * Generates an auditable Weekly / "Quarterly Results" financial performance report
 * derived strictly from immutable Bahi-Khata ledger transactions.
 */
export async function generateQuarterlyResults(userId: string): Promise<GeneratedQuarterlyReport> {
  const effectiveNow = await getEffectiveDate(userId);
  const sevenDaysAgo = new Date(effectiveNow);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Fetch Transactions in the 7-day period
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      timestamp: { gte: sevenDaysAgo, lte: effectiveNow },
    },
    include: {
      subject: { select: { id: true, code: true, name: true } },
      concept: { select: { id: true, name: true } },
    },
  });

  let revenueGained = 0;
  let depreciationLoss = 0;

  // Track per-department net performance
  const departmentNet: Record<string, { code: string; name: string; net: number }> = {};

  for (const tx of transactions) {
    if (tx.amount > 0) {
      revenueGained += tx.amount;
    } else {
      depreciationLoss += Math.abs(tx.amount);
    }

    if (tx.subjectId && tx.subject) {
      if (!departmentNet[tx.subjectId]) {
        departmentNet[tx.subjectId] = {
          code: tx.subject.code,
          name: tx.subject.name,
          net: 0,
        };
      }
      departmentNet[tx.subjectId].net += tx.amount;
    }
  }

  const netValueChange = Number((revenueGained - depreciationLoss).toFixed(2));

  // Determine Best and Worst Department
  let bestDepartment = "General Holdings";
  let worstDepartment = "General Holdings";
  let maxNet = -Infinity;
  let minNet = Infinity;

  const deptEntries = Object.values(departmentNet);
  if (deptEntries.length > 0) {
    for (const d of deptEntries) {
      if (d.net > maxNet) {
        maxNet = d.net;
        bestDepartment = `${d.code} (${d.net >= 0 ? "+" : ""}${d.net.toFixed(1)})`;
      }
      if (d.net < minNet) {
        minNet = d.net;
        worstDepartment = `${d.code} (${d.net >= 0 ? "+" : ""}${d.net.toFixed(1)})`;
      }
    }
  } else {
    // If no transactions, pull from subject list
    const subjects = await prisma.subject.findMany({
      where: { userId },
      select: { code: true, sharePrice: true },
      orderBy: { sharePrice: "desc" },
    });
    if (subjects.length > 0) {
      bestDepartment = subjects[0].code;
      worstDepartment = subjects[subjects.length - 1].code;
    }
  }

  // 2. Credit Rating and Audit Delta
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditRating: true },
  });
  const currentRating = user?.creditRating || "AAA";

  const latestAudit = await prisma.creditRatingAudit.findFirst({
    where: {
      userId,
      timestamp: { gte: sevenDaysAgo },
    },
    orderBy: { timestamp: "desc" },
  });

  let creditRatingDelta = "Unchanged (Sovereign Solvency Stable)";
  if (latestAudit?.previousRating) {
    creditRatingDelta = `${latestAudit.previousRating} → ${latestAudit.rating} (${latestAudit.reason})`;
  }

  // 3. Top 3 Concepts at Risk Next Week
  const in7Days = new Date(effectiveNow);
  in7Days.setDate(in7Days.getDate() + 7);

  const concepts = await prisma.concept.findMany({
    where: { subject: { userId } },
    include: {
      subject: { select: { code: true } },
      cards: { select: { stability: true, lastReview: true } },
    },
  });

  const atRiskList = [];
  for (const c of concepts) {
    if (c.cards.length === 0) continue;
    const curRs = c.cards.map((card) => calculateRetrievability(card.stability, card.lastReview, effectiveNow));
    const projRs = c.cards.map((card) => calculateRetrievability(card.stability, card.lastReview, in7Days));

    const curVal = (curRs.reduce((s, r) => s + r, 0) / curRs.length) * 100;
    const projVal = (projRs.reduce((s, r) => s + r, 0) / projRs.length) * 100;

    if (projVal < 50 || curVal - projVal > 5) {
      atRiskList.push({
        name: c.name,
        subjectCode: c.subject.code,
        currentValue: Number(curVal.toFixed(1)),
        projected7d: Number(projVal.toFixed(1)),
        drop: curVal - projVal,
      });
    }
  }

  atRiskList.sort((a, b) => b.drop - a.drop);
  const top3AtRisk = atRiskList.slice(0, 3);

  // 4. Grounded AI-written CEO Letter: exactly 3 blunt points
  const ceoLetter: CeoLetter = {
    wentWell:
      revenueGained > 0
        ? `Reinvested ₹${revenueGained.toFixed(1)} of study capital through active repetitions, led by strong retention in ${bestDepartment}.`
        : `Capitalized initial balance sheet without incurring debt defaults or missed examination gates.`,
    slipping:
      depreciationLoss > 0
        ? `Incurred -₹${depreciationLoss.toFixed(1)} in retrievability depreciation, with ${worstDepartment} showing early decay slope.`
        : `No unhedged depreciation recorded; balance sheet maintained steady book value.`,
    oneThingToDo:
      top3AtRisk.length > 0
        ? `Execute a focused review session on "${top3AtRisk[0].name}" (${top3AtRisk[0].subjectCode}) before it breaches the 50.0 solvency floor.`
        : `Maintain review clearance across all chartered departments to defend your ${currentRating} credit rating.`,
  };

  // 5. Save to Database Archive
  const report = await prisma.quarterlyReport.create({
    data: {
      userId,
      startDate: sevenDaysAgo,
      endDate: effectiveNow,
      revenueGained: Number(revenueGained.toFixed(2)),
      depreciationLoss: Number(depreciationLoss.toFixed(2)),
      netValueChange,
      bestDepartment,
      worstDepartment,
      creditRating: currentRating,
      creditRatingDelta,
      conceptsAtRisk: top3AtRisk as unknown as Prisma.InputJsonValue,
      ceoLetter: ceoLetter as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    id: report.id,
    startDate: sevenDaysAgo.toISOString(),
    endDate: effectiveNow.toISOString(),
    revenueGained: report.revenueGained,
    depreciationLoss: report.depreciationLoss,
    netValueChange: report.netValueChange,
    bestDepartment: report.bestDepartment,
    worstDepartment: report.worstDepartment,
    creditRating: report.creditRating,
    creditRatingDelta: report.creditRatingDelta,
    conceptsAtRisk: top3AtRisk,
    ceoLetter,
  };
}
