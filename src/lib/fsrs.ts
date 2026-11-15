import { fsrs, Rating, createEmptyCard, Card as FSRSCard, State, RecordLog } from "ts-fsrs";
import { prisma } from "./prisma";
import { CardType, TransactionType } from "@prisma/client";

// Initialize FSRS engine with standard retention settings
export const fsrsEngine = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
});

/**
 * Calculates current retrievability R(t) based on FSRS stability and elapsed days.
 * Formula: R(t, S) = (1 + 0.19 * (t / S)) ^ -0.5
 * Returns value between 0.0 and 1.0
 */
export function calculateRetrievability(
  stability: number,
  lastReviewDate: Date | null,
  now: Date
): number {
  if (!lastReviewDate || stability <= 0) {
    return 0.0;
  }

  const elapsedMs = Math.max(0, now.getTime() - new Date(lastReviewDate).getTime());
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  // FSRS decay formula
  const factor = 0.19;
  const power = -0.5;
  const retrievability = Math.pow(1 + factor * (elapsedDays / Math.max(stability, 0.1)), power);

  return Math.min(1.0, Math.max(0.0, retrievability));
}

/**
 * Helper to get the active simulated date taking User.simulatedDateOffsetDays into account.
 */
export async function getEffectiveDate(userId: string): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { simulatedDateOffsetDays: true },
  });

  const offset = user?.simulatedDateOffsetDays || 0;
  const now = new Date();
  if (offset !== 0) {
    now.setDate(now.getDate() + offset);
  }
  return now;
}

/**
 * Recomputes concept asset values and department share prices based on FSRS depreciation decay.
 * Writes a DEPRECIATION transaction if concept value dropped since last evaluation.
 */
export async function recomputeDepreciation(userId: string, targetSubjectId?: string) {
  const effectiveNow = await getEffectiveDate(userId);

  const subjects = await prisma.subject.findMany({
    where: {
      userId,
      ...(targetSubjectId ? { id: targetSubjectId } : {}),
    },
    include: {
      concepts: {
        include: {
          cards: true,
        },
      },
      assignments: {
        where: { status: "GRADED" },
      },
    },
  });

  let userTotalValuation = 0;

  for (const subject of subjects) {
    let subjectConceptSum = 0;

    for (const concept of subject.concepts) {
      const cards = concept.cards;
      let newConceptValue = 0;

      if (cards.length > 0) {
        const retrievabilities = cards.map((c) =>
          calculateRetrievability(c.stability, c.lastReview, effectiveNow)
        );
        const avgRetrievability =
          retrievabilities.reduce((sum, r) => sum + r, 0) / cards.length;
        // Concept asset value = average retrievability * 100 (0 - 100)
        newConceptValue = Number((avgRetrievability * 100).toFixed(2));
      }

      const oldValue = concept.value;
      const delta = Number((newConceptValue - oldValue).toFixed(2));

      // If value dropped by at least 0.05, record a DEPRECIATION transaction in the Bahi-Khata ledger
      if (delta < -0.05) {
        await prisma.transaction.create({
          data: {
            userId,
            subjectId: subject.id,
            conceptId: concept.id,
            type: "DEPRECIATION",
            amount: delta, // negative value
            beforeValue: oldValue,
            afterValue: newConceptValue,
            reason: `FSRS retrievability decay: ${concept.name} depreciated to ${newConceptValue}`,
          },
        });
      }

      if (Math.abs(delta) > 0.01) {
        await prisma.concept.update({
          where: { id: concept.id },
          data: { value: newConceptValue },
        });
      }

      subjectConceptSum += newConceptValue;
    }

    // Share price derivation: strictly derived from recall accuracy (concept values) + assignment outcomes!
    const conceptAvg = subject.concepts.length > 0 ? subjectConceptSum / subject.concepts.length : 0;

    let assignmentMultiplier = 1.0;
    if (subject.assignments.length > 0) {
      const totalWeight = subject.assignments.reduce((sum, a) => sum + a.weight, 0);
      const weightedScore = subject.assignments.reduce((sum, a) => sum + (a.grade || 0) * a.weight, 0);
      if (totalWeight > 0) {
        assignmentMultiplier = Math.max(0.5, Math.min(1.5, (weightedScore / totalWeight) / 100));
      }
    }

    const calculatedSharePrice = Number((conceptAvg * assignmentMultiplier).toFixed(2));

    await prisma.subject.update({
      where: { id: subject.id },
      data: { sharePrice: calculatedSharePrice },
    });

    userTotalValuation += subjectConceptSum;
  }

  // Update overall User total valuation
  await prisma.user.update({
    where: { id: userId },
    data: { totalValuation: Number(userTotalValuation.toFixed(2)) },
  });

  return { effectiveNow, totalValuation: userTotalValuation };
}

/**
 * Executes an active recall review on a single card using ts-fsrs.
 * Updates stability, difficulty, reps, due date, concept value, and records a REINVESTMENT transaction.
 */
export async function executeCardReview(params: {
  cardId: string;
  grade: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  userId: string;
}) {
  const effectiveNow = await getEffectiveDate(params.userId);

  const card = await prisma.card.findUnique({
    where: { id: params.cardId },
    include: {
      concept: {
        include: {
          subject: true,
          cards: true,
        },
      },
    },
  });

  if (!card) {
    throw new Error("Card not found");
  }

  // Construct FSRSCard object
  const emptyCard = createEmptyCard(effectiveNow);
  const fsrsInputCard: FSRSCard = {
    ...emptyCard,
    due: card.due || effectiveNow,
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    scheduled_days: 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: (card.state as State) || State.New,
    last_review: card.lastReview || undefined,
  };

  // Run FSRS scheduling algorithm
  const schedulingRecord: RecordLog = fsrsEngine.repeat(fsrsInputCard, effectiveNow);
  const updatedItem = schedulingRecord[params.grade as 1 | 2 | 3 | 4];
  const updatedCard = updatedItem.card;

  // Compute before and after concept value
  const oldConceptValue = card.concept.value;

  // Update card in DB
  await prisma.card.update({
    where: { id: card.id },
    data: {
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      due: updatedCard.due,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      state: updatedCard.state,
      lastReview: effectiveNow,
    },
  });

  // Calculate new concept retrievability across cards
  const allCards = card.concept.cards.map((c) =>
    c.id === card.id
      ? { stability: updatedCard.stability, lastReview: effectiveNow }
      : { stability: c.stability, lastReview: c.lastReview }
  );
  const retrievabilities = allCards.map((c) =>
    calculateRetrievability(c.stability, c.lastReview, effectiveNow)
  );
  const newConceptValue = Number(
    ((retrievabilities.reduce((s, r) => s + r, 0) / allCards.length) * 100).toFixed(2)
  );
  const valueDelta = Number((newConceptValue - oldConceptValue).toFixed(2));

  // Log Review
  const review = await prisma.review.create({
    data: {
      cardId: card.id,
      userId: params.userId,
      grade: params.grade,
      beforeValue: oldConceptValue,
      afterValue: newConceptValue,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      timestamp: effectiveNow,
    },
  });

  // Post REINVESTMENT transaction in Bahi-Khata ledger
  await prisma.transaction.create({
    data: {
      userId: params.userId,
      subjectId: card.concept.subjectId,
      conceptId: card.concept.id,
      type: "REINVESTMENT",
      amount: valueDelta,
      beforeValue: oldConceptValue,
      afterValue: newConceptValue,
      reason: `Revision reinvestment: Reviewed "${card.concept.name}" [Grade ${params.grade}]`,
      refId: review.id,
      timestamp: effectiveNow,
    },
  });

  // Update concept value
  await prisma.concept.update({
    where: { id: card.concept.id },
    data: {
      value: newConceptValue,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      lastReviewedAt: effectiveNow,
      nextReviewAt: updatedCard.due,
    },
  });

  // Recalculate subject share price
  await recomputeDepreciation(params.userId, card.concept.subjectId);

  return {
    review,
    valueDelta,
    conceptName: card.concept.name,
    newConceptValue,
    subjectName: card.concept.subject.name,
  };
}
