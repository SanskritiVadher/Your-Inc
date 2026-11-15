/**
 * Calculates deadline risk score:
 * riskScore = weight * (1 - progress) / daysLeft
 *
 * Weight is the syllabus evaluation percentage (e.g. 20.0 for 20%).
 * Progress is 0.0 to 1.0 (or normalized from 0-100).
 * Days left is fractional days until deadline.
 */
export function calculateDeadlineRiskScore(
  weight: number,
  progress: number, // 0 to 1 or 0 to 100
  deadline: Date | string,
  nowDate: Date | string = new Date()
): { riskScore: number; daysLeft: number; urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" } {
  const deadlineDate = new Date(deadline);
  const current = new Date(nowDate);

  // Normalize progress to 0..1
  const normProgress = progress > 1 ? Math.min(1, progress / 100) : Math.max(0, progress);

  const diffMs = deadlineDate.getTime() - current.getTime();
  const rawDaysLeft = diffMs / (1000 * 60 * 60 * 24);
  const daysLeft = Number(rawDaysLeft.toFixed(2));

  // If already 100% complete, risk score is 0.0
  if (normProgress >= 1) {
    return { riskScore: 0.0, daysLeft, urgencyLevel: "LOW" };
  }

  // If overdue or less than 2.4 hours left (0.1 days)
  const effectiveDays = Math.max(0.1, rawDaysLeft);
  const rawScore = (weight * (1 - normProgress)) / effectiveDays;
  const riskScore = Number(rawScore.toFixed(2));

  let urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (rawDaysLeft <= 0 || riskScore >= 50) {
    urgencyLevel = "CRITICAL";
  } else if (riskScore >= 20 || rawDaysLeft <= 2) {
    urgencyLevel = "HIGH";
  } else if (riskScore >= 10 || rawDaysLeft <= 5) {
    urgencyLevel = "MEDIUM";
  }

  return { riskScore, daysLeft, urgencyLevel };
}
