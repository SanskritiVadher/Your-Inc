import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export const RATING_SCALE = ["AAA", "AA", "A", "BBB", "BB", "B", "C", "D"] as const;
export type CreditRatingGrade = typeof RATING_SCALE[number];

/**
 * Pure helper to compute next downgraded notch.
 */
export function calculateNextDowngrade(current: CreditRatingGrade): CreditRatingGrade {
  const currentIndex = RATING_SCALE.indexOf(current);
  if (currentIndex === -1) return "D";
  const nextIndex = Math.min(RATING_SCALE.length - 1, currentIndex + 1);
  return RATING_SCALE[nextIndex];
}

/**
 * Pure helper to compute next upgraded notch.
 */
export function calculateNextUpgrade(current: CreditRatingGrade): CreditRatingGrade {
  const currentIndex = RATING_SCALE.indexOf(current);
  if (currentIndex === -1) return "AAA";
  const prevIndex = Math.max(0, currentIndex - 1);
  return RATING_SCALE[prevIndex];
}

/**
 * Pure helper to compute bridge loan terms (2 free skips / month, ₹5.00 thereafter).
 */
export function calculateBridgeLoanTerms(skipsUsedThisMonth: number): {
  isFree: boolean;
  penalty: number;
  freeSkipsRemaining: number;
} {
  const isFree = skipsUsedThisMonth < 2;
  const penalty = isFree ? 0.0 : 5.0;
  const freeSkipsRemaining = Math.max(0, 2 - skipsUsedThisMonth);
  return { isFree, penalty, freeSkipsRemaining };
}

/**
 * Recovery requires at least 7 clean days.
 */
export function isEligibleFor7DayRecovery(cleanDays: number): boolean {
  return cleanDays >= 7;
}

/**
 * Drops the student's credit rating by one notch due to a missed deadline or delinquency.
 */
export async function downgradeCreditRating(
  userId: string,
  reason: string
): Promise<{ previousRating: string; newRating: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditRating: true },
  });

  const currentRating = (user?.creditRating || "AAA") as CreditRatingGrade;
  const currentIndex = RATING_SCALE.indexOf(currentRating);

  // If already at D, can't downgrade further
  const nextIndex = Math.min(RATING_SCALE.length - 1, currentIndex + 1);
  const newRating = RATING_SCALE[nextIndex];

  if (newRating !== currentRating) {
    await prisma.user.update({
      where: { id: userId },
      data: { creditRating: newRating },
    });

    // Audit log
    await prisma.creditRatingAudit.create({
      data: {
        userId,
        rating: newRating,
        previousRating: currentRating,
        reason,
      },
    });
  }

  return { previousRating: currentRating, newRating };
}

/**
 * Upgrades the student's credit rating by one notch after sustained clean performance.
 */
export async function upgradeCreditRating(
  userId: string,
  reason: string
): Promise<{ previousRating: string; newRating: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditRating: true },
  });

  const currentRating = (user?.creditRating || "BBB") as CreditRatingGrade;
  const currentIndex = RATING_SCALE.indexOf(currentRating);

  // If already at AAA, can't upgrade further
  const prevIndex = Math.max(0, currentIndex - 1);
  const newRating = RATING_SCALE[prevIndex];

  if (newRating !== currentRating) {
    await prisma.user.update({
      where: { id: userId },
      data: { creditRating: newRating },
    });

    // Audit log
    await prisma.creditRatingAudit.create({
      data: {
        userId,
        rating: newRating,
        previousRating: currentRating,
        reason,
      },
    });
  }

  return { previousRating: currentRating, newRating };
}

/**
 * Processes a Bridge Loan skip day request for the student.
 * 2 free skips per calendar month (no penalty, no credit impact).
 * Additional skips are borrowed with an explicit small value penalty.
 */
export async function applyBridgeLoanSkip(
  userId: string,
  skipDate?: Date,
  reason = "Personal day / Recalibration"
) {
  const effectiveNow = await getEffectiveDate(userId);
  const targetDate = skipDate || effectiveNow;

  // Calculate skips already taken this calendar month
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  const monthSkips = await prisma.bridgeLoan.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const skipCount = monthSkips.length;
  const isFree = skipCount < 2;
  const penalty = isFree ? 0.0 : 5.0; // ₹5.00 grace interest charge if borrowed beyond 2

  const loan = await prisma.bridgeLoan.create({
    data: {
      userId,
      date: targetDate,
      isFree,
      penalty,
      reason,
      status: "ACTIVE",
    },
  });

  // If penalty applies, record an explicit transaction in the Bahi-Khata ledger
  if (penalty > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalValuation: true },
    });
    const currentVal = user?.totalValuation || 0;
    const newVal = Math.max(0, currentVal - penalty);

    await prisma.user.update({
      where: { id: userId },
      data: { totalValuation: newVal },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: "DEPRECIATION",
        amount: -penalty,
        beforeValue: currentVal,
        afterValue: newVal,
        reason: `Bridge Loan Grace Interest (Skip #${skipCount + 1} this month): Rating protected from downgrade`,
      },
    });
  }

  return {
    loan,
    skipNumberThisMonth: skipCount + 1,
    isFree,
    penaltyApplied: penalty,
    remainingFreeSkips: Math.max(0, 2 - (skipCount + 1)),
  };
}

/**
 * Retrieves credit rating audit trail and bridge loan allowances for the user.
 */
export async function getCreditAndLoanStatus(userId: string) {
  const effectiveNow = await getEffectiveDate(userId);
  const startOfMonth = new Date(effectiveNow.getFullYear(), effectiveNow.getMonth(), 1);

  const [user, audits, monthLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { creditRating: true, totalValuation: true },
    }),
    prisma.creditRatingAudit.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 15,
    }),
    prisma.bridgeLoan.findMany({
      where: {
        userId,
        date: { gte: startOfMonth },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const freeSkipsUsed = monthLoans.filter((l) => l.isFree).length;
  const borrowedSkips = monthLoans.filter((l) => !l.isFree).length;

  return {
    currentRating: user?.creditRating || "AAA",
    audits,
    monthLoans,
    freeSkipsUsed,
    freeSkipsRemaining: Math.max(0, 2 - freeSkipsUsed),
    borrowedSkips,
  };
}
