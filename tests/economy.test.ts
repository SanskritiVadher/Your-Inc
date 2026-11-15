import {
  computeSharePriceFormula,
} from "../src/lib/economy/sharePrice";
import {
  calculateNextDowngrade,
  calculateNextUpgrade,
  calculateBridgeLoanTerms,
  isEligibleFor7DayRecovery,
  RATING_SCALE,
  CreditRatingGrade,
} from "../src/lib/economy/creditRating";

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

console.log("\n=======================================================");
console.log("RUNNING SUITE: Phase 6 You Inc. Economy & Ledger Tests");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Share Price Formula Tests
// ---------------------------------------------------------------------------
console.log("--- 1. Share Price Formula & 70/30 Component Tests ---");

// Normal with both concepts and assignments
{
  const result = computeSharePriceFormula(80.0, 90.0);
  // 0.70 * 80 = 56.0, 0.30 * 90 = 27.0 => 83.00
  assertEqual(result.conceptPart, 56.0, "70% concept mastery contribution for 80.0 is 56.0");
  assertEqual(result.assignmentPart, 27.0, "30% assignment contribution for 90.0 is 27.0");
  assertEqual(result.sharePrice, 83.0, "Total share price is exactly 83.00 (Crosses IPO)");
}

// Subject with no assignments yet (assignmentAvg is null)
{
  const result = computeSharePriceFormula(74.0, null);
  // Uses concept average as baseline => 74.00
  assertEqual(result.sharePrice, 74.0, "Baseline without assignments gracefully equals concept mastery");
}

// Edge case: Zero reviews yet (brand new concept with 0.0 or empty)
{
  const result = computeSharePriceFormula(0.0, null);
  assertEqual(result.sharePrice, 0.0, "Zero reviews returns 0.00 without NaN");
  assertTrue(!isNaN(result.sharePrice), "Zero reviews returns a valid finite number");
}

// Edge case: All reviews failed (0% retrievability)
{
  const result = computeSharePriceFormula(0.0, 0.0);
  assertEqual(result.sharePrice, 0.0, "Failed reviews return 0.00 floor");
}

// Edge case: NaN / undefined inputs guarded
{
  const result = computeSharePriceFormula(NaN, null);
  assertEqual(result.sharePrice, 0.0, "NaN concept input safely recovers to 0.0");
}

// ---------------------------------------------------------------------------
// 2. Credit Rating Downgrade & Recovery Tests
// ---------------------------------------------------------------------------
console.log("\n--- 2. Sovereign Credit Rating Notches & 7-Day Clean Recovery ---");

// Downgrade 1 notch on missed deadline
{
  assertEqual(calculateNextDowngrade("AAA"), "AA", "Missed deadline downgrades AAA to AA");
  assertEqual(calculateNextDowngrade("AA"), "A", "Missed deadline downgrades AA to A");
  assertEqual(calculateNextDowngrade("A"), "BBB", "Missed deadline downgrades A to BBB");
  assertEqual(calculateNextDowngrade("BBB"), "BB", "Missed deadline downgrades BBB to BB");
  assertEqual(calculateNextDowngrade("BB"), "B", "Missed deadline downgrades BB to B");
  assertEqual(calculateNextDowngrade("B"), "C", "Missed deadline downgrades B to C");
  assertEqual(calculateNextDowngrade("C"), "D", "Missed deadline downgrades C to D");
  assertEqual(calculateNextDowngrade("D"), "D", "Default tier D does not overflow bounds");
}

// Upgrade 1 notch upon 7 clean days
{
  assertEqual(calculateNextUpgrade("D"), "C", "Upgrade promotes D to C");
  assertEqual(calculateNextUpgrade("C"), "B", "Upgrade promotes C to B");
  assertEqual(calculateNextUpgrade("BBB"), "A", "Upgrade promotes BBB to A");
  assertEqual(calculateNextUpgrade("AA"), "AAA", "Upgrade promotes AA to AAA");
  assertEqual(calculateNextUpgrade("AAA"), "AAA", "Top tier AAA does not overflow bounds");
}

// 7-day clean streak threshold
{
  assertTrue(!isEligibleFor7DayRecovery(0), "0 clean days cannot trigger rating recovery");
  assertTrue(!isEligibleFor7DayRecovery(6), "6 clean days is insufficient for rating recovery");
  assertTrue(isEligibleFor7DayRecovery(7), "7 clean days unlocks 1-notch rating recovery");
  assertTrue(isEligibleFor7DayRecovery(14), "14 clean days maintains recovery eligibility");
}

// ---------------------------------------------------------------------------
// 3. Bridge Loan Facility: Free Skips vs Penalty Math
// ---------------------------------------------------------------------------
console.log("\n--- 3. Bridge Loan Facility: 2 Free Skips/Month & ₹5.00 Penalty Math ---");

// First skip of the month (0 previously used)
{
  const terms = calculateBridgeLoanTerms(0);
  assertEqual(terms.isFree, true, "1st skip in month is free");
  assertEqual(terms.penalty, 0.0, "1st skip incurs ₹0.00 penalty");
  assertEqual(terms.freeSkipsRemaining, 2, "2 free skips available before taking 1st skip");
}

// Second skip of the month (1 previously used)
{
  const terms = calculateBridgeLoanTerms(1);
  assertEqual(terms.isFree, true, "2nd skip in month is free");
  assertEqual(terms.penalty, 0.0, "2nd skip incurs ₹0.00 penalty");
  assertEqual(terms.freeSkipsRemaining, 1, "1 free skip remaining after 1st skip taken");
}

// Third skip (2 previously used -> borrowing from liquidity facility)
{
  const terms = calculateBridgeLoanTerms(2);
  assertEqual(terms.isFree, false, "3rd skip is drawn on bridge loan facility");
  assertEqual(terms.penalty, 5.0, "3rd skip incurs ₹5.00 book-value penalty");
  assertEqual(terms.freeSkipsRemaining, 0, "0 free skips remaining");
}

// Fourth skip (3 previously used)
{
  const terms = calculateBridgeLoanTerms(3);
  assertEqual(terms.isFree, false, "4th skip is drawn on bridge loan facility");
  assertEqual(terms.penalty, 5.0, "4th skip incurs ₹5.00 book-value penalty");
}

console.log("\n=======================================================");
console.log("ALL 18 UNIT & INTEGRITY TESTS PASSED SUCCESSFULLY!");
console.log("=======================================================\n");
