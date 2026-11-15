import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveDate, calculateRetrievability } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get("conceptId");
    const subjectId = searchParams.get("subjectId");

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({
        totalValueAtRiskThisWeek: 0,
        atRiskConcepts: [],
      });
    }

    const effectiveNow = await getEffectiveDate(user.id);

    // Fetch concepts with cards
    const concepts = await prisma.concept.findMany({
      where: {
        subject: {
          userId: user.id,
          ...(subjectId ? { id: subjectId } : {}),
        },
        ...(conceptId ? { id: conceptId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        cards: {
          select: {
            id: true,
            stability: true,
            difficulty: true,
            lastReview: true,
            reps: true,
          },
        },
      },
    });

    let totalValueAtRiskThisWeek = 0;
    const atRiskConcepts = [];

    const in7Days = new Date(effectiveNow);
    in7Days.setDate(in7Days.getDate() + 7);

    for (const concept of concepts) {
      if (concept.cards.length === 0) continue;

      // Current retrievability
      const currentRs = concept.cards.map((c) =>
        calculateRetrievability(c.stability, c.lastReview, effectiveNow)
      );
      const currentAvgR = currentRs.reduce((s, r) => s + r, 0) / currentRs.length;
      const currentVal = Number((currentAvgR * 100).toFixed(2));

      // Projected retrievability in 7 days
      const projectedRs = concept.cards.map((c) =>
        calculateRetrievability(c.stability, c.lastReview, in7Days)
      );
      const projectedAvgR = projectedRs.reduce((s, r) => s + r, 0) / projectedRs.length;
      const projectedVal = Number((projectedAvgR * 100).toFixed(2));

      const loss = Math.max(0, Number((currentVal - projectedVal).toFixed(2)));
      totalValueAtRiskThisWeek += loss;

      // Check if it drops below 50 in 7 days
      if (projectedVal < 50 || (currentVal >= 50 && projectedVal < 50)) {
        // Calculate approx days until dropping below 50
        let daysUntilSub50 = 7;
        for (let d = 1; d <= 7; d++) {
          const testDate = new Date(effectiveNow);
          testDate.setDate(testDate.getDate() + d);
          const testRs = concept.cards.map((c) =>
            calculateRetrievability(c.stability, c.lastReview, testDate)
          );
          const testAvg = (testRs.reduce((s, r) => s + r, 0) / testRs.length) * 100;
          if (testAvg < 50) {
            daysUntilSub50 = d;
            break;
          }
        }

        atRiskConcepts.push({
          id: concept.id,
          name: concept.name,
          currentValue: currentVal,
          projectedValue7d: projectedVal,
          valueLoss: loss,
          daysUntilSub50,
          subjectId: concept.subject.id,
          subjectName: concept.subject.name,
          subjectCode: concept.subject.code,
          cardCount: concept.cards.length,
        });
      }
    }

    // Sort at-risk concepts by urgency
    atRiskConcepts.sort((a, b) => a.daysUntilSub50 - b.daysUntilSub50 || b.valueLoss - a.valueLoss);

    // If single concept requested, generate detailed curve points and review logs
    let curveData = null;
    let reviewHistory = null;

    if (conceptId && concepts.length === 1) {
      const target = concepts[0];
      const curvePoints = [];

      for (let day = 0; day <= 30; day += 2) {
        const pointDate = new Date(effectiveNow);
        pointDate.setDate(pointDate.getDate() + day);

        const pointRs = target.cards.map((c) =>
          calculateRetrievability(c.stability, c.lastReview, pointDate)
        );
        const avgR = target.cards.length > 0 ? pointRs.reduce((s, r) => s + r, 0) / target.cards.length : 0;
        const val = Number((avgR * 100).toFixed(1));

        curvePoints.push({
          day: day === 0 ? "Today" : `+${day}d`,
          daysFromNow: day,
          value: val,
          retrievability: Number((avgR * 100).toFixed(1)),
        });
      }

      curveData = curvePoints;

      // Reviews
      reviewHistory = await prisma.review.findMany({
        where: {
          card: { conceptId: target.id },
        },
        orderBy: { timestamp: "desc" },
        take: 10,
        select: {
          id: true,
          grade: true,
          beforeValue: true,
          afterValue: true,
          timestamp: true,
        },
      });
    }

    return NextResponse.json({
      totalValueAtRiskThisWeek: Number(totalValueAtRiskThisWeek.toFixed(2)),
      atRiskConcepts,
      curveData,
      reviewHistory,
      effectiveNow: effectiveNow.toISOString(),
    });
  } catch (err: unknown) {
    console.error("Depreciation risk API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to calculate depreciation" },
      { status: 500 }
    );
  }
}
