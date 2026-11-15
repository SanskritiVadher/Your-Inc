export interface WeeklyPlacementSchedule {
  weeksRemaining: number;
  isPastStartDate: boolean;
  priorityConceptsToReview: string[];
  mockInterviewsPerWeek: {
    mode: "PM" | "CONSULTING" | "MARKETING" | "BEHAVIOURAL";
    count: number;
    reason: string;
  }[];
  projectMilestone: string;
  resumeCheckpoint: string;
  strategicNote: string;
}

export function calculatePlacementCountdown(
  placementStartDate: Date,
  currentDate = new Date(),
  targetRole = "Product Manager",
  gapSkills: string[] = ["Market Sizing", "Data & AI"],
  recentMockAverage = 72.0
): WeeklyPlacementSchedule {
  const diffMs = placementStartDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const weeksRemaining = Math.max(0, Math.ceil(diffDays / 7));
  const isPastStartDate = diffDays <= 0;

  // Determine mock volume based on mock score and weeks left
  let pmCount = 1;
  let consultingCount = 1;
  let behaviouralCount = 1;

  if (targetRole.toLowerCase().includes("product")) {
    pmCount = recentMockAverage < 75 ? 3 : 2;
    consultingCount = 1;
  } else if (targetRole.toLowerCase().includes("consult")) {
    consultingCount = recentMockAverage < 75 ? 3 : 2;
    pmCount = 0;
  } else if (targetRole.toLowerCase().includes("brand") || targetRole.toLowerCase().includes("market")) {
    pmCount = 1;
    consultingCount = 0;
  }

  // Adjust for final sprint (last 3 weeks)
  let projectMilestone = "Log and formalize at least 1 course case study into Project Vault per sprint.";
  let resumeCheckpoint = "Draft resume bullets using strict 'Action + Method + Outcome' syntax.";

  if (weeksRemaining <= 2 && !isPastStartDate) {
    projectMilestone = "Freeze Project Vault. Finalize STAR stories for all 3 top showcased initiatives.";
    resumeCheckpoint = "Final one-page resume lock. Audit all metrics for 100% factual accuracy.";
  } else if (weeksRemaining <= 4) {
    projectMilestone = "Refine project metrics with group project teammates; approve drafts in Vault.";
    resumeCheckpoint = "Run peer resume review with squad members focusing on quantifiable impact.";
  }

  const strategicNote =
    weeksRemaining <= 2
      ? "Placement season is imminent. Focus exclusively on fast structuring, behavioural STAR delivery, and high-frequency live mock drills."
      : `You have ${weeksRemaining} weeks until day-1 placement rounds. Prioritize depreciating concepts in ${gapSkills.join(" and ")} to bridge candidate profile gaps.`;

  return {
    weeksRemaining,
    isPastStartDate,
    priorityConceptsToReview: gapSkills,
    mockInterviewsPerWeek: [
      { mode: "PM" as const, count: pmCount, reason: `Target role core competencies (${targetRole})` },
      { mode: "CONSULTING" as const, count: consultingCount, reason: "Case structuring and quantitative sanity checks" },
      { mode: "BEHAVIOURAL" as const, count: behaviouralCount, reason: "STAR alignment for partner and leadership rounds" },
    ].filter((m) => m.count > 0),
    projectMilestone,
    resumeCheckpoint,
    strategicNote,
  };
}
