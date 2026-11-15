import { prisma } from "@/lib/prisma";

export type ConfidenceLevel = "not_sure" | "fairly_sure" | "very_sure";

export type CalibrationLabel =
  | "You know more than you think"
  | "Spot on"
  | "Worth another look";

export interface CalibrationResult {
  label: CalibrationLabel;
  accuracy: number;
  totalAnswers: number;
  daysCount: number;
  confidence: ConfidenceLevel;
}

export interface BlindSpotItem {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  subjectCode: string;
  label: CalibrationLabel;
  confidence: ConfidenceLevel;
  trendChange?: string; // e.g. "Last week: worth another look → now: spot on"
  detailNumbers: {
    correct: number;
    total: number;
    daysCount: number;
    accuracyPercent: number;
  };
  targetedCardIds: string[];
}

/**
 * Pure calculation logic for unit testing and deterministic calibration.
 * Rules:
 * - Calculated ONLY after ≥6 answers across 2+ days.
 * - Uses only the last 10 answers.
 */
export function calculateCalibration(
  answers: Array<{ grade: number; timestamp: Date }>,
  confidence: ConfidenceLevel
): CalibrationResult | null {
  if (!answers || answers.length < 6) {
    return null; // <6 answers -> no label
  }

  // Count distinct calendar days (YYYY-MM-DD in UTC)
  const distinctDays = new Set(
    answers.map((a) => {
      const d = new Date(a.timestamp);
      return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
    })
  );

  if (distinctDays.size < 2) {
    return null; // <2 days -> no label
  }

  // Take only the last 10 answers (most recent)
  const sorted = [...answers].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const last10 = sorted.slice(-10);

  // In spaced repetition: Grade 3 ("Good") and 4 ("Easy") indicate correct retention
  const correctCount = last10.filter((a) => a.grade >= 3).length;
  const accuracy = correctCount / last10.length;

  let label: CalibrationLabel;

  if (accuracy >= 0.70) {
    if (confidence === "not_sure") {
      label = "You know more than you think";
    } else {
      label = "Spot on";
    }
  } else if (accuracy >= 0.50) {
    if (confidence === "fairly_sure") {
      label = "Spot on";
    } else {
      label = "Worth another look";
    }
  } else {
    // accuracy < 0.50
    label = "Worth another look";
  }

  return {
    label,
    accuracy,
    totalAnswers: last10.length,
    daysCount: distinctDays.size,
    confidence,
  };
}

/**
 * Records confidence rating once per topic per day.
 */
export async function recordTopicConfidence(
  userId: string,
  conceptId: string,
  confidence: ConfidenceLevel
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existingToday = await prisma.topicConfidence.findFirst({
    where: {
      userId,
      conceptId,
      date: { gte: startOfDay },
    },
  });

  if (existingToday) {
    return prisma.topicConfidence.update({
      where: { id: existingToday.id },
      data: { confidence },
    });
  }

  return prisma.topicConfidence.create({
    data: {
      userId,
      conceptId,
      confidence,
    },
  });
}

/**
 * Returns candidate topic for the pre-session 1-tap question.
 * Skippable; max once per topic per day.
 */
export async function getCandidateTopicForConfidence(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Find concepts the student has cards for that haven't been asked today
  const concepts = await prisma.concept.findMany({
    where: {
      subject: { userId },
      cards: { some: {} },
      confidences: {
        none: {
          userId,
          date: { gte: startOfDay },
        },
      },
    },
    include: {
      subject: true,
      _count: { select: { cards: true } },
    },
    take: 1,
  });

  if (concepts.length === 0) return null;

  const c = concepts[0];
  return {
    conceptId: c.id,
    conceptName: c.name,
    subjectName: c.subject.name,
    subjectCode: c.subject.code,
  };
}

/**
 * Fetches user's current blind spots for display after session or in weekly report.
 * Returns max 2 items.
 */
export async function getUserBlindSpots(userId: string): Promise<BlindSpotItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { blindSpotsEnabled: true },
  });

  if (!user || user.blindSpotsEnabled === false) {
    return [];
  }

  // Fetch recent confidences
  const confidences = await prisma.topicConfidence.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: {
      concept: {
        include: {
          subject: true,
          cards: {
            include: {
              reviews: {
                where: { userId },
                orderBy: { timestamp: "asc" },
              },
            },
          },
        },
      },
    },
  });

  // Group by concept to get latest confidence and historical confidence
  const conceptMap = new Map<string, { latest: typeof confidences[0]; previous?: typeof confidences[0] }>();
  for (const conf of confidences) {
    if (!conceptMap.has(conf.conceptId)) {
      conceptMap.set(conf.conceptId, { latest: conf });
    } else {
      const entry = conceptMap.get(conf.conceptId)!;
      if (!entry.previous) {
        entry.previous = conf;
      }
    }
  }

  const results: BlindSpotItem[] = [];

  for (const [conceptId, { latest, previous }] of Array.from(conceptMap.entries())) {
    const concept = latest.concept;
    // Collect all reviews for this concept's cards
    const allReviews: Array<{ grade: number; timestamp: Date }> = [];
    const cardIds: string[] = [];

    for (const card of concept.cards) {
      cardIds.push(card.id);
      for (const rev of card.reviews) {
        allReviews.push({ grade: rev.grade, timestamp: rev.timestamp });
      }
    }

    const currentCalib = calculateCalibration(
      allReviews,
      latest.confidence as ConfidenceLevel
    );

    if (!currentCalib) continue;

    // Check trend change
    let trendChange: string | undefined = undefined;
    if (previous) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const olderReviews = allReviews.filter((r) => new Date(r.timestamp) < oneWeekAgo);
      const olderCalib = calculateCalibration(
        olderReviews,
        previous.confidence as ConfidenceLevel
      );
      if (olderCalib && olderCalib.label !== currentCalib.label) {
        trendChange = `Last week: ${olderCalib.label.toLowerCase()} → now: ${currentCalib.label.toLowerCase()}`;
      }
    }

    const sorted = [...allReviews].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const last10 = sorted.slice(-10);
    const correctCount = last10.filter((a) => a.grade >= 3).length;

    results.push({
      conceptId: concept.id,
      conceptName: concept.name,
      subjectName: concept.subject.name,
      subjectCode: concept.subject.code,
      label: currentCalib.label,
      confidence: latest.confidence as ConfidenceLevel,
      trendChange,
      detailNumbers: {
        correct: correctCount,
        total: last10.length,
        daysCount: currentCalib.daysCount,
        accuracyPercent: Math.round(currentCalib.accuracy * 100),
      },
      targetedCardIds: cardIds.slice(0, 5), // 5 targeted cards for 3-minute fix
    });
  }

  // Priority sort: "Worth another look" first, then "You know more than you think", then "Spot on"
  const priorityOrder: Record<CalibrationLabel, number> = {
    "Worth another look": 1,
    "You know more than you think": 2,
    "Spot on": 3,
  };

  results.sort((a, b) => priorityOrder[a.label] - priorityOrder[b.label]);

  // Max 2 shown at a time
  return results.slice(0, 2);
}
