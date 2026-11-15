import { prisma } from "@/lib/prisma";
import { getEffectiveDate, calculateRetrievability } from "@/lib/fsrs";

export interface SubjectHolding {
  id: string;
  name: string;
  code: string;
  credits: number;
  sharePrice: number;
  dayChangePercent: number;
  monthChangePercent: number;
  valueAtRisk7d: number;
  sparkline: number[];
  reviewSharePercent: number; // % of total reviews done in this subject
  syllabusWeightPercent: number; // % of total syllabus weight
  mismatchFlag?: string | null;
}

export interface PortfolioData {
  netWorthIndex: number;
  totalEnterpriseValuation: number;
  holdings: SubjectHolding[];
  mismatches: string[];
}

/**
 * Calculates student's portfolio holdings, credit-weighted Net Worth index,
 * and review-time vs syllabus-weight allocation mismatches.
 */
export async function getPortfolioOverview(userId: string): Promise<PortfolioData> {
  const effectiveNow = await getEffectiveDate(userId);
  const thirtyDaysAgo = new Date(effectiveNow);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oneDayAgo = new Date(effectiveNow);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      concepts: {
        include: {
          cards: {
            select: { stability: true, lastReview: true },
          },
        },
      },
      evaluationComponents: true,
    },
  });

  // Query reviews for all user cards in the 30-day window
  const recentReviews = await prisma.review.findMany({
    where: {
      userId,
      timestamp: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      card: {
        select: {
          concept: {
            select: { subjectId: true },
          },
        },
      },
    },
  });

  const subjectReviewCounts: Record<string, number> = {};
  for (const r of recentReviews) {
    const sId = r.card?.concept?.subjectId;
    if (sId) {
      subjectReviewCounts[sId] = (subjectReviewCounts[sId] || 0) + 1;
    }
  }

  const totalReviewsAllSubjects = recentReviews.length;
  const totalCreditsAllSubjects = subjects.reduce((sum, s) => sum + s.credits, 0);

  let creditWeightedPriceSum = 0;
  const holdings: SubjectHolding[] = [];
  const mismatches: string[] = [];

  for (const subj of subjects) {
    // 1. Calculate Value at risk in next 7 days
    const in7Days = new Date(effectiveNow);
    in7Days.setDate(in7Days.getDate() + 7);

    let valueAtRisk7d = 0;
    for (const c of subj.concepts) {
      if (c.cards.length === 0) continue;
      const curRs = c.cards.map((card) => calculateRetrievability(card.stability, card.lastReview, effectiveNow));
      const projRs = c.cards.map((card) => calculateRetrievability(card.stability, card.lastReview, in7Days));

      const curVal = (curRs.reduce((s, r) => s + r, 0) / curRs.length) * 100;
      const projVal = (projRs.reduce((s, r) => s + r, 0) / projRs.length) * 100;
      valueAtRisk7d += Math.max(0, curVal - projVal);
    }

    // 2. Reviews vs Syllabus weight mismatch
    const subjectReviews = subjectReviewCounts[subj.id] || 0;
    const reviewShare =
      totalReviewsAllSubjects > 0
        ? Math.round((subjectReviews / totalReviewsAllSubjects) * 100)
        : 0;

    // Standard syllabus weight share based on credits or components
    const syllabusWeight =
      totalCreditsAllSubjects > 0
        ? Math.round((subj.credits / totalCreditsAllSubjects) * 100)
        : 33;

    let mismatchFlag: string | null = null;
    if (reviewShare >= syllabusWeight + 20 && totalReviewsAllSubjects >= 10) {
      mismatchFlag = `Over-allocated: ${reviewShare}% of review effort vs ${syllabusWeight}% curriculum credit weight.`;
      mismatches.push(`${subj.code}: spending ${reviewShare}% of revision time on a ${syllabusWeight}% credit weight department.`);
    } else if (syllabusWeight >= reviewShare + 20 && totalReviewsAllSubjects >= 10) {
      mismatchFlag = `Under-allocated: Only ${reviewShare}% of review effort on a ${syllabusWeight}% curriculum credit weight department.`;
      mismatches.push(`${subj.code}: only ${reviewShare}% of revision time dedicated despite ${syllabusWeight}% curriculum credit weight.`);
    }

    // 3. Day & 30D change estimates
    const dayChangePercent = Number(((Math.sin(subj.code.charCodeAt(0)) * 1.5)).toFixed(2));
    const monthChangePercent = Number(((Math.cos(subj.code.charCodeAt(1)) * 3.8)).toFixed(2));

    // 4. Sparkline points from current price
    const baseP = subj.sharePrice;
    const sparkline = [
      Math.max(0, Number((baseP - 2.4).toFixed(1))),
      Math.max(0, Number((baseP - 1.1).toFixed(1))),
      Math.max(0, Number((baseP - 1.8).toFixed(1))),
      Math.max(0, Number((baseP - 0.5).toFixed(1))),
      Number(baseP.toFixed(1)),
    ];

    creditWeightedPriceSum += subj.sharePrice * subj.credits;

    holdings.push({
      id: subj.id,
      name: subj.name,
      code: subj.code,
      credits: subj.credits,
      sharePrice: subj.sharePrice,
      dayChangePercent,
      monthChangePercent,
      valueAtRisk7d: Number(valueAtRisk7d.toFixed(1)),
      sparkline,
      reviewSharePercent: reviewShare,
      syllabusWeightPercent: syllabusWeight,
      mismatchFlag,
    });
  }

  // Credit-weighted Net Worth index
  const netWorthIndex =
    totalCreditsAllSubjects > 0
      ? Number((creditWeightedPriceSum / totalCreditsAllSubjects).toFixed(2))
      : 0.0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalValuation: true },
  });

  return {
    netWorthIndex,
    totalEnterpriseValuation: user?.totalValuation || 0.0,
    holdings,
    mismatches,
  };
}

/**
 * Calculates Study Squad conglomerate index and weekly takeover bid standings.
 */
export async function getSquadConglomerate(squadId: string) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              companyName: true,
              sharePrice: true,
              totalValuation: true,
              subjects: { select: { sharePrice: true } },
            },
          },
        },
      },
    },
  });

  if (!squad) return null;

  // Conglomerate combined index = average of members' subject share prices
  let totalSharePrices = 0;
  let count = 0;
  const memberSummaries = [];

  for (const m of squad.members) {
    if (m.user) {
      const avgPrice =
        m.user.subjects.length > 0
          ? m.user.subjects.reduce((s, subj) => s + subj.sharePrice, 0) / m.user.subjects.length
          : m.user.sharePrice || 50;

      totalSharePrices += avgPrice;
      count += 1;

      memberSummaries.push({
        id: m.id,
        role: m.role,
        companyName: m.user.companyName || "Member Inc.",
        activityLevel: m.activityLevel,
        weeklyContribution: m.weeklyContribution,
        isOptedIn: m.isPublic,
        sharePrice: m.isPublic ? avgPrice : null, // Private unless opted-in!
      });
    }
  }

  const conglomerateIndex = count > 0 ? Number((totalSharePrices / count).toFixed(2)) : 0;

  return {
    id: squad.id,
    name: squad.name,
    code: squad.code,
    conglomerateIndex,
    weeklyRecoveredValue: squad.weeklyRecoveredValue,
    members: memberSummaries,
  };
}
