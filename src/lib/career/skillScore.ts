import { prisma } from "@/lib/prisma";

export const DEFAULT_SKILLS = [
  { name: "Product Sense", category: "Product & Strategy" },
  { name: "Market Sizing", category: "Analytical Foundation" },
  { name: "Financial Analysis", category: "Finance & Accounting" },
  { name: "Consumer Research", category: "Marketing & Insights" },
  { name: "Strategy", category: "Corporate Strategy" },
  { name: "Marketing", category: "Marketing & Insights" },
  { name: "Operations", category: "Operations & Supply Chain" },
  { name: "Leadership & OB", category: "People & Organization" },
  { name: "Communication", category: "Executive Presence" },
  { name: "Data & AI", category: "Analytics & Technology" },
];

export interface RoleSkillWeight {
  skillName: string;
  weight: number; // 0.0 to 1.0 (sums to 1.0)
  benchmarkProficiency: number; // e.g. 80.0
}

export const ROLE_PROFILES: Record<string, RoleSkillWeight[]> = {
  "Product Manager": [
    { skillName: "Product Sense", weight: 0.30, benchmarkProficiency: 85.0 },
    { skillName: "Data & AI", weight: 0.20, benchmarkProficiency: 80.0 },
    { skillName: "Strategy", weight: 0.20, benchmarkProficiency: 80.0 },
    { skillName: "Market Sizing", weight: 0.15, benchmarkProficiency: 75.0 },
    { skillName: "Communication", weight: 0.15, benchmarkProficiency: 80.0 },
  ],
  "Management Consultant": [
    { skillName: "Strategy", weight: 0.25, benchmarkProficiency: 85.0 },
    { skillName: "Market Sizing", weight: 0.25, benchmarkProficiency: 85.0 },
    { skillName: "Financial Analysis", weight: 0.25, benchmarkProficiency: 85.0 },
    { skillName: "Communication", weight: 0.15, benchmarkProficiency: 85.0 },
    { skillName: "Operations", weight: 0.10, benchmarkProficiency: 75.0 },
  ],
  "Brand Manager": [
    { skillName: "Marketing", weight: 0.30, benchmarkProficiency: 85.0 },
    { skillName: "Consumer Research", weight: 0.30, benchmarkProficiency: 85.0 },
    { skillName: "Product Sense", weight: 0.20, benchmarkProficiency: 80.0 },
    { skillName: "Communication", weight: 0.20, benchmarkProficiency: 80.0 },
  ],
  "Business Analyst": [
    { skillName: "Data & AI", weight: 0.35, benchmarkProficiency: 85.0 },
    { skillName: "Operations", weight: 0.25, benchmarkProficiency: 80.0 },
    { skillName: "Financial Analysis", weight: 0.20, benchmarkProficiency: 80.0 },
    { skillName: "Market Sizing", weight: 0.20, benchmarkProficiency: 75.0 },
  ],
};

/**
 * Initializes default MBA skills for a user if they don't have skills yet.
 */
export async function ensureDefaultSkills(userId: string) {
  const existing = await prisma.skill.findMany({ where: { userId } });
  if (existing.length === 0) {
    for (const item of DEFAULT_SKILLS) {
      await prisma.skill.create({
        data: {
          userId,
          name: item.name,
          category: item.category,
          proficiency: 50.0, // baseline start
        },
      });
    }
  }
}

/**
 * Computes a skill's proficiency score:
 * 70% weighted concept mastery + 30% mock interview / cold call average.
 * If no mock interviews exist, 100% concept mastery.
 * NEVER self-rated.
 */
export function calculateSkillScore(
  conceptValues: { value: number; weight: number }[],
  mockScores: number[]
): number {
  let conceptComponent = 50.0;
  if (conceptValues.length > 0) {
    const totalWeight = conceptValues.reduce((sum, c) => sum + (c.weight || 1.0), 0);
    const weightedSum = conceptValues.reduce((sum, c) => sum + c.value * (c.weight || 1.0), 0);
    conceptComponent = totalWeight > 0 ? weightedSum / totalWeight : 50.0;
  }

  if (mockScores.length === 0) {
    return Number(Math.min(100.0, Math.max(0.0, conceptComponent)).toFixed(1));
  }

  const mockAvg = mockScores.reduce((sum, s) => sum + s, 0) / mockScores.length;
  const blended = 0.70 * conceptComponent + 0.30 * mockAvg;
  return Number(Math.min(100.0, Math.max(0.0, blended)).toFixed(1));
}

/**
 * Suggests concept-to-skill mappings using academic title and category matching.
 */
export async function suggestConceptSkillMappings(userId: string) {
  const [skills, concepts] = await Promise.all([
    prisma.skill.findMany({ where: { userId } }),
    prisma.concept.findMany({
      where: { subject: { userId } },
      include: { subject: true, skillConcepts: true },
    }),
  ]);

  const suggestions: Array<{
    conceptId: string;
    conceptName: string;
    subjectCode: string;
    skillId: string;
    skillName: string;
    rationale: string;
  }> = [];

  for (const c of concepts) {
    // Only suggest if not already confirmed
    const linkedSkillIds = new Set(c.skillConcepts.map((sc) => sc.skillId));
    const nameLower = c.name.toLowerCase();
    const deptLower = (c.subject.name + " " + c.subject.code).toLowerCase();

    for (const s of skills) {
      if (linkedSkillIds.has(s.id)) continue;

      let match = false;
      let rationale = "";

      if (
        s.name === "Financial Analysis" &&
        (nameLower.includes("wacc") || nameLower.includes("valuation") || nameLower.includes("cash flow") || deptLower.includes("fin"))
      ) {
        match = true;
        rationale = "Fundamental corporate finance and valuation competency.";
      } else if (
        s.name === "Market Sizing" &&
        (nameLower.includes("market") || nameLower.includes("sizing") || nameLower.includes("guesstimate") || nameLower.includes("tam"))
      ) {
        match = true;
        rationale = "Top-down / bottom-up market sizing and demand estimation.";
      } else if (
        s.name === "Strategy" &&
        (nameLower.includes("porter") || nameLower.includes("advantage") || nameLower.includes("moat") || nameLower.includes("position") || deptLower.includes("str"))
      ) {
        match = true;
        rationale = "Core competitive strategy and sustainable moat analysis.";
      } else if (
        s.name === "Product Sense" &&
        (nameLower.includes("product") || nameLower.includes("ux") || nameLower.includes("roadmap") || nameLower.includes("mvp") || nameLower.includes("feature"))
      ) {
        match = true;
        rationale = "User-centric problem solving and feature prioritization.";
      } else if (
        s.name === "Consumer Research" &&
        (nameLower.includes("persona") || nameLower.includes("segment") || nameLower.includes("cohort") || nameLower.includes("journey") || deptLower.includes("mkt"))
      ) {
        match = true;
        rationale = "Behavioral customer discovery and segmentation methodology.";
      } else if (
        s.name === "Marketing" &&
        (nameLower.includes("price") || nameLower.includes("channel") || nameLower.includes("gtm") || nameLower.includes("cac") || nameLower.includes("brand"))
      ) {
        match = true;
        rationale = "Go-to-market architecture, unit economics, and positioning.";
      } else if (
        s.name === "Operations" &&
        (nameLower.includes("supply") || nameLower.includes("inventory") || nameLower.includes("eoq") || nameLower.includes("lean") || nameLower.includes("bottleneck") || deptLower.includes("ops"))
      ) {
        match = true;
        rationale = "Process optimization, throughput, and inventory dynamics.";
      } else if (
        s.name === "Leadership & OB" &&
        (nameLower.includes("culture") || nameLower.includes("negotiat") || nameLower.includes("conflict") || nameLower.includes("team") || deptLower.includes("ob"))
      ) {
        match = true;
        rationale = "Organizational behavior, team alignment, and executive leadership.";
      } else if (
        s.name === "Data & AI" &&
        (nameLower.includes("regress") || nameLower.includes("model") || nameLower.includes("neural") || nameLower.includes("analytics") || nameLower.includes("llm") || deptLower.includes("data"))
      ) {
        match = true;
        rationale = "Empirical data analysis, statistical modeling, and AI application.";
      }

      if (match) {
        suggestions.push({
          conceptId: c.id,
          conceptName: c.name,
          subjectCode: c.subject.code,
          skillId: s.id,
          skillName: s.name,
          rationale,
        });
      }
    }
  }

  return suggestions.slice(0, 15);
}

/**
 * Calculates Target Role gaps based on student's current skill profile.
 */
export function calculateRoleGaps(
  targetRoleName: string,
  userSkills: { name: string; proficiency: number }[]
): {
  roleName: string;
  overallMatchScore: number;
  weakestSkills: { name: string; current: number; benchmark: number; gap: number }[];
  gapSummary: string;
} {
  const profile = ROLE_PROFILES[targetRoleName] || [
    { skillName: "Strategy", weight: 0.30, benchmarkProficiency: 80.0 },
    { skillName: "Financial Analysis", weight: 0.30, benchmarkProficiency: 80.0 },
    { skillName: "Communication", weight: 0.20, benchmarkProficiency: 80.0 },
    { skillName: "Market Sizing", weight: 0.20, benchmarkProficiency: 75.0 },
  ];

  const skillMap = new Map<string, number>();
  for (const s of userSkills) {
    skillMap.set(s.name, s.proficiency);
  }

  let totalWeightedScore = 0;
  const gaps: { name: string; current: number; benchmark: number; gap: number }[] = [];

  for (const item of profile) {
    const current = skillMap.get(item.skillName) || 50.0;
    totalWeightedScore += current * item.weight;
    const gap = item.benchmarkProficiency - current;
    gaps.push({
      name: item.skillName,
      current,
      benchmark: item.benchmarkProficiency,
      gap: Number(gap.toFixed(1)),
    });
  }

  // Sort by biggest deficit
  gaps.sort((a, b) => b.gap - a.gap);
  const weakest = gaps.filter((g) => g.gap > 0).slice(0, 2);

  const gapSummary =
    weakest.length > 0
      ? `For ${targetRoleName}, your priority gaps are ${weakest.map((w) => `${w.name} (${w.current} vs ${w.benchmark})`).join(" and ")}.`
      : `You meet all baseline benchmarks for ${targetRoleName}. Maintain revision to prevent depreciation.`;

  return {
    roleName: targetRoleName,
    overallMatchScore: Number(totalWeightedScore.toFixed(1)),
    weakestSkills: gaps,
    gapSummary,
  };
}
