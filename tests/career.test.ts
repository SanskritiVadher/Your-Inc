import {
  calculateSkillScore,
  calculateRoleGaps,
  DEFAULT_SKILLS,
  ROLE_PROFILES,
} from "../src/lib/career/skillScore";
import { generateProjectArtifacts } from "../src/lib/career/projectVault";
import { calculatePlacementCountdown } from "../src/lib/career/countdown";

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message}. Expected: ${expected}, Got: ${actual}`);
  }
  console.log(`✓ PASS: ${message}`);
}

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

function assertFalse(condition: boolean, message: string) {
  if (condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log("\n=======================================================");
console.log("RUNNING SUITE: Phase 9 Career Vault, Skills & Placements");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Skill Score Formula Tests (70% Concept Mastery + 30% Mock Interview)
// ---------------------------------------------------------------------------
console.log("--- 1. Audited Skill Score Calculations ---");

{
  // Normal case: Concepts avg = 80.0, Mock avg = 90.0
  // 0.70 * 80 + 0.30 * 90 = 56 + 27 = 83.0
  const score = calculateSkillScore(
    [{ value: 80.0, weight: 1.0 }],
    [90.0]
  );
  assertEqual(score, 83.0, "70% concept (80) + 30% mock (90) = exactly 83.0");
}

{
  // Weighted concepts: Concept A = 100.0 (wt 2.0), Concept B = 70.0 (wt 1.0)
  // Weighted avg = (200 + 70) / 3 = 90.0
  // Mock = 80.0 => 0.70 * 90 + 0.30 * 80 = 63 + 24 = 87.0
  const score = calculateSkillScore(
    [
      { value: 100.0, weight: 2.0 },
      { value: 70.0, weight: 1.0 },
    ],
    [80.0]
  );
  assertEqual(score, 87.0, "Weighted concept mastery is computed accurately");
}

{
  // Fallback: No mock interviews logged yet => 100% concept mastery
  const score = calculateSkillScore(
    [{ value: 76.5, weight: 1.0 }],
    []
  );
  assertEqual(score, 76.5, "Without mock interviews, defaults to 100% concept mastery");
}

{
  // Edge case: Empty concepts and empty mocks
  const score = calculateSkillScore([], []);
  assertEqual(score, 50.0, "Zero mappings default safely to 50.0 without NaN");
}

// ---------------------------------------------------------------------------
// 2. Default MBA Skills & Role Profiles
// ---------------------------------------------------------------------------
console.log("\n--- 2. Default MBA Skill Roster & Roles ---");

{
  assertEqual(DEFAULT_SKILLS.length, 10, "10 core default MBA skills initialized");
  assertTrue(
    DEFAULT_SKILLS.some((s) => s.name === "Product Sense"),
    "Product Sense present"
  );
  assertTrue(
    DEFAULT_SKILLS.some((s) => s.name === "Market Sizing"),
    "Market Sizing present"
  );
  assertTrue(
    DEFAULT_SKILLS.some((s) => s.name === "Financial Analysis"),
    "Financial Analysis present"
  );

  const pmProfile = ROLE_PROFILES["Product Manager"];
  assertTrue(Boolean(pmProfile), "Product Manager profile exists");
  const totalPmWeight = pmProfile.reduce((sum, w) => sum + w.weight, 0);
  assertEqual(Number(totalPmWeight.toFixed(2)), 1.0, "Product Manager skill weights sum to 1.00");
}

// ---------------------------------------------------------------------------
// 3. Target Role Gap Analysis
// ---------------------------------------------------------------------------
console.log("\n--- 3. Target Role Gap Analysis ---");

{
  const userSkills = [
    { name: "Product Sense", proficiency: 85.0 }, // benchmark 85.0 (gap 0)
    { name: "Data & AI", proficiency: 60.0 },     // benchmark 80.0 (gap 20.0)
    { name: "Strategy", proficiency: 80.0 },      // benchmark 80.0 (gap 0)
    { name: "Market Sizing", proficiency: 50.0 }, // benchmark 75.0 (gap 25.0)
    { name: "Communication", proficiency: 75.0 }, // benchmark 80.0 (gap 5.0)
  ];

  const analysis = calculateRoleGaps("Product Manager", userSkills);
  assertEqual(analysis.roleName, "Product Manager", "Analyzes Product Manager profile");
  assertEqual(analysis.weakestSkills[0].name, "Market Sizing", "Biggest gap identified as Market Sizing");
  assertEqual(analysis.weakestSkills[0].gap, 25.0, "Market Sizing gap is exactly 25.0");
  assertEqual(analysis.weakestSkills[1].name, "Data & AI", "Second gap identified as Data & AI");
  assertEqual(analysis.weakestSkills[1].gap, 20.0, "Data & AI gap is exactly 20.0");
  assertTrue(
    analysis.gapSummary.includes("Market Sizing") && analysis.gapSummary.includes("Data & AI"),
    "Summary string names priority gap areas"
  );
}

// ---------------------------------------------------------------------------
// 4. Project Vault & Zero-Hallucination Artifact Generation
// ---------------------------------------------------------------------------
console.log("\n--- 4. Project Vault Zero-Hallucination Testing ---");

{
  // Test A: Student provides real metric
  const artifactsWithMetric = generateProjectArtifacts({
    title: "Zepto Dark-Store Layout Optimization",
    problem: "Fulfillment delays during peak hours",
    role: "Operations Lead",
    method: "Linear programming and bottleneck analysis",
    tools: "Python, Excel Solver",
    outcome: "Streamlined picking paths and staged dispatch",
    metric: "18% reduction in dispatch latency and ₹14L annual savings",
    teamSize: 3,
  });

  assertTrue(artifactsWithMetric.hasMetric, "Reports metric is present");
  assertTrue(
    artifactsWithMetric.resumeBullet.includes("18% reduction in dispatch latency"),
    "Verified metric included in resume bullet"
  );
  assertTrue(
    artifactsWithMetric.starStory.result.includes("18% reduction in dispatch latency"),
    "Verified metric incorporated into STAR story result"
  );
  assertEqual(artifactsWithMetric.metricNotice, undefined, "No warning notice when real metric is provided");
}

{
  // Test B: Student DOES NOT provide metric -> ZERO INVENTED NUMBERS
  const artifactsWithoutMetric = generateProjectArtifacts({
    title: "Brand Repositioning for Heritage Dairy",
    problem: "Declining relevance among Gen-Z urban consumers",
    role: "Brand Strategist",
    method: "Qualitative focus groups and perceptual mapping",
    tools: "Figma, Qualtrics",
    outcome: "Authored new brand narrative and launched pilot packaging",
    metric: "", // NO METRIC
  });

  assertFalse(artifactsWithoutMetric.hasMetric, "Reports metric is not present");
  assertTrue(
    Boolean(artifactsWithoutMetric.metricNotice),
    "Emits explicit notice that bullet was drafted without fabricated figures"
  );

  // Check that NO numbers or fake percentages were hallucinated
  assertFalse(artifactsWithoutMetric.resumeBullet.includes("%"), "Resume bullet has NO hallucinated % sign");
  assertFalse(artifactsWithoutMetric.resumeBullet.includes("$"), "Resume bullet has NO hallucinated $ sign");
  assertFalse(artifactsWithoutMetric.resumeBullet.includes("₹"), "Resume bullet has NO hallucinated ₹ sign");
  assertFalse(artifactsWithoutMetric.starStory.result.includes("%"), "STAR story result has NO hallucinated % sign");
  assertFalse(artifactsWithoutMetric.linkedInDesc.includes("%"), "LinkedIn description has NO hallucinated % sign");
}

// ---------------------------------------------------------------------------
// 5. Placement Countdown Scheduling Math
// ---------------------------------------------------------------------------
console.log("\n--- 5. Placement Countdown Schedule Calculations ---");

{
  // 6 weeks out from placement date
  const now = new Date("2026-10-01T00:00:00Z");
  const placementDate = new Date("2026-11-12T00:00:00Z"); // 42 days = 6 weeks

  const schedule = calculatePlacementCountdown(
    placementDate,
    now,
    "Product Manager",
    ["Market Sizing", "Data & AI"],
    68.0 // Mock score deficit (<75)
  );

  assertEqual(schedule.weeksRemaining, 6, "Calculates exactly 6 weeks remaining");
  assertFalse(schedule.isPastStartDate, "Placement is in future");
  const pmMocks = schedule.mockInterviewsPerWeek.find((m) => m.mode === "PM");
  assertEqual(pmMocks?.count, 3, "High mock volume (3/wk) recommended due to mock deficit");
}

{
  // Final sprint: 2 weeks out
  const now = new Date("2026-10-29T00:00:00Z");
  const placementDate = new Date("2026-11-12T00:00:00Z"); // 14 days = 2 weeks

  const sprintSchedule = calculatePlacementCountdown(
    placementDate,
    now,
    "Product Manager",
    ["Market Sizing"],
    85.0
  );

  assertEqual(sprintSchedule.weeksRemaining, 2, "2 weeks remaining");
  assertTrue(
    sprintSchedule.projectMilestone.includes("Freeze Project Vault"),
    "Final sprint locks project vault"
  );
  assertTrue(
    sprintSchedule.resumeCheckpoint.includes("Final one-page resume lock"),
    "Final sprint requires one-page resume lock"
  );
}

console.log("\n=======================================================");
console.log("ALL 20 PHASE 9 TESTS PASSED SUCCESSFULLY! ✓");
console.log("=======================================================\n");
