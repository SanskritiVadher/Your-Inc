import { calculateCalibration } from "../src/lib/review/blindSpotService";
import {
  calculateFormulaInCode,
  generatePracticeScenario,
  validateUserPracticeAnswer,
} from "../src/lib/formulas/calculator";
import { computeDeckSourceHash } from "../src/lib/revision/revisionSheetService";

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
console.log("RUNNING SUITE: Student Features (Revision, Formulas, Blind Spots)");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Blind Spots & Calibration Tests
// ---------------------------------------------------------------------------
console.log("--- 1. Blind Spots Calibration Engine ---");

// Test 1: < 6 answers -> no label
{
  const day1 = new Date("2026-11-10T10:00:00Z");
  const day2 = new Date("2026-11-11T10:00:00Z");
  const answers = [
    { grade: 3, timestamp: day1 },
    { grade: 4, timestamp: day1 },
    { grade: 3, timestamp: day1 },
    { grade: 4, timestamp: day2 },
    { grade: 4, timestamp: day2 },
  ]; // 5 answers

  const result = calculateCalibration(answers, "fairly_sure");
  assertEqual(result, null, "Under 6 answers (<6) returns no label (null)");
}

// Test 2: < 2 days -> no label
{
  const singleDay = new Date("2026-11-10T14:00:00Z");
  const answers = [
    { grade: 4, timestamp: new Date(singleDay.getTime() + 1000) },
    { grade: 4, timestamp: new Date(singleDay.getTime() + 2000) },
    { grade: 3, timestamp: new Date(singleDay.getTime() + 3000) },
    { grade: 4, timestamp: new Date(singleDay.getTime() + 4000) },
    { grade: 3, timestamp: new Date(singleDay.getTime() + 5000) },
    { grade: 4, timestamp: new Date(singleDay.getTime() + 6000) },
    { grade: 4, timestamp: new Date(singleDay.getTime() + 7000) },
  ]; // 7 answers, but 1 day

  const result = calculateCalibration(answers, "very_sure");
  assertEqual(result, null, "Answers across only 1 day (<2 days) returns no label (null)");
}

// Test 3: Strong recent answers change label even if older answers were poor
{
  const day1 = new Date("2026-11-01T10:00:00Z");
  const day2 = new Date("2026-11-05T10:00:00Z");
  const day3 = new Date("2026-11-06T10:00:00Z");

  const answers = [
    // 5 older poor answers (grades 1 and 2)
    { grade: 1, timestamp: new Date(day1.getTime() + 100) },
    { grade: 1, timestamp: new Date(day1.getTime() + 200) },
    { grade: 2, timestamp: new Date(day1.getTime() + 300) },
    { grade: 1, timestamp: new Date(day1.getTime() + 400) },
    { grade: 2, timestamp: new Date(day1.getTime() + 500) },

    // Recent 10 answers: 9 out of 10 correct across day 2 and day 3
    { grade: 3, timestamp: new Date(day2.getTime() + 1000) },
    { grade: 4, timestamp: new Date(day2.getTime() + 2000) },
    { grade: 4, timestamp: new Date(day2.getTime() + 3000) },
    { grade: 3, timestamp: new Date(day2.getTime() + 4000) },
    { grade: 4, timestamp: new Date(day2.getTime() + 5000) },
    { grade: 4, timestamp: new Date(day3.getTime() + 1000) },
    { grade: 3, timestamp: new Date(day3.getTime() + 2000) },
    { grade: 4, timestamp: new Date(day3.getTime() + 3000) },
    { grade: 4, timestamp: new Date(day3.getTime() + 4000) },
    { grade: 2, timestamp: new Date(day3.getTime() + 5000) },
  ];

  // When student felt "not_sure", but recent 10 answers had 90% accuracy:
  const resultNotSure = calculateCalibration(answers, "not_sure");
  assertTrue(resultNotSure !== null, "Calibration calculated for >=6 answers across >=2 days");
  assertEqual(
    resultNotSure?.label,
    "You know more than you think",
    "Strong recent answers with 'not_sure' yield 'You know more than you think'"
  );
  assertEqual(resultNotSure?.accuracy, 0.9, "Uses only the last 10 answers for accuracy");

  // When student felt "very_sure", and performance is 90%:
  const resultVerySure = calculateCalibration(answers, "very_sure");
  assertEqual(
    resultVerySure?.label,
    "Spot on",
    "Strong recent answers with 'very_sure' yield 'Spot on'"
  );
}

// Test 3b: Overconfidence test
{
  const day1 = new Date("2026-11-05T10:00:00Z");
  const day2 = new Date("2026-11-06T10:00:00Z");

  // Student rated "very_sure", but struggled in recent answers (only 1 out of 6 correct)
  const answers = [
    { grade: 1, timestamp: new Date(day1.getTime() + 100) },
    { grade: 2, timestamp: new Date(day1.getTime() + 200) },
    { grade: 1, timestamp: new Date(day1.getTime() + 300) },
    { grade: 3, timestamp: new Date(day2.getTime() + 100) },
    { grade: 1, timestamp: new Date(day2.getTime() + 200) },
    { grade: 2, timestamp: new Date(day2.getTime() + 300) },
  ];

  const result = calculateCalibration(answers, "very_sure");
  assertTrue(result !== null, "Calibration calculated");
  assertEqual(
    result?.label,
    "Worth another look",
    "Overconfident student with low recent accuracy yields 'Worth another look'"
  );
}

// ---------------------------------------------------------------------------
// 2. Deterministic MBA Formula Math Engine (Zero AI arithmetic)
// ---------------------------------------------------------------------------
console.log("\n--- 2. Deterministic Formula Math Engine (Code-calculated) ---");

// Test 4: WACC calculation
{
  // E=60%, D=40%, Re=12%, Rd=6%, t=25%
  // WACC = (60/100)*12 + (40/100)*6*(1-0.25) = 7.2 + 1.8 = 9.00%
  const res = calculateFormulaInCode("wacc", {
    equityRatio: 60,
    debtRatio: 40,
    costEquity: 12,
    costDebt: 6,
    taxRate: 25,
  });

  assertEqual(res.answer, 9.0, "WACC arithmetic executed in code equals exactly 9.0%");
  assertTrue(res.steps.length >= 3, "Shows step-by-step calculation breakdown");
  assertEqual(res.units, "%", "WACC units are %");
}

// Test 5: DuPont 3-Way ROE
{
  // Net Margin = 8%, Asset Turnover = 1.5, Financial Leverage = 2.0
  // ROE = 8 * 1.5 * 2.0 = 24.00%
  const res = calculateFormulaInCode("dupont", {
    netMargin: 8,
    assetTurnover: 1.5,
    equityMultiplier: 2.0,
  });

  assertEqual(res.answer, 24.0, "DuPont 3-Way arithmetic in code equals exactly 24.0%");
}

// Test 6: Break-Even Volume
{
  // FC = 50,000, Price = 100, Variable Cost = 60
  // Unit Contribution = 40
  // Q_BE = 50,000 / 40 = 1,250 units
  const res = calculateFormulaInCode("breakeven", {
    fixedCosts: 50000,
    pricePerUnit: 100,
    variableCostPerUnit: 60,
  });

  assertEqual(res.answer, 1250, "Break-even units calculated in code equals exactly 1250");
  assertEqual(res.units, "units", "Units are units");
}

// Test 7: Practice Answer Validation with Tolerance
{
  const exactMatch = validateUserPracticeAnswer(1250, "1250", "units");
  assertTrue(exactMatch, "Exact answer accepted");

  const withinTolerance = validateUserPracticeAnswer(9.0, "8.99", "%");
  assertTrue(withinTolerance, "Answer within rounding tolerance accepted");

  const wrongAnswer = validateUserPracticeAnswer(1250, "1100", "units");
  assertFalse(wrongAnswer, "Incorrect answer flagged correctly");
}

// Test 8: Randomized practice drill generation
{
  const scenario = generatePracticeScenario("wacc");
  assertTrue(scenario.prompt.length > 20, "Generates grounded practice prompt");
  assertTrue(scenario.params.equityRatio > 0, "Generates randomized equity ratio parameter");
  assertTrue(scenario.params.costEquity > 0, "Generates randomized cost of equity parameter");
}

// ---------------------------------------------------------------------------
// 3. Revision Sheet Caching Hash Engine
// ---------------------------------------------------------------------------
console.log("\n--- 3. Revision Sheet Hash & Invalidation ---");

// Test 9: Hash consistency and invalidation on personal notes change
{
  const date = new Date("2026-11-10T10:00:00Z");
  const deck = {
    id: "deck-123",
    title: "Session 4: DCF Valuation",
    updatedAt: date,
    slides: [
      { id: "s1", number: 1, text: "Introduction to DCF", personalNotes: "Important", updatedAt: date },
      { id: "s2", number: 2, text: "Terminal value formulas", personalNotes: "", updatedAt: date },
    ],
  };
  const notes = [{ id: "n1", content: "Prof said exam focus", updatedAt: date }];

  const hash1 = computeDeckSourceHash(deck, notes);
  const hash2 = computeDeckSourceHash(deck, notes);
  assertEqual(hash1, hash2, "Identical content yields identical source hash (cached)");

  // Modifying student notes changes the hash -> triggers regeneration
  const notesUpdated = [{ id: "n1", content: "Prof said exam focus on perpetuity formula", updatedAt: new Date("2026-11-12T10:00:00Z") }];
  const hash3 = computeDeckSourceHash(deck, notesUpdated);
  assertTrue(hash1 !== hash3, "Updating notes invalidates cache and triggers regeneration");
}

console.log("\n=======================================================");
console.log("ALL STUDENT FEATURE TESTS PASSED SUCCESSFULLY! ✓");
console.log("=======================================================\n");
