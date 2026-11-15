import { calculateDeadlineRiskScore } from "../src/lib/planner/riskScore";
import {
  parseNaturalLanguageAssignment,
  extractAssignmentBrief,
} from "../src/lib/planner/naturalLanguageParser";
import { generateIcsFeed, CalendarEvent } from "../src/lib/planner/calendarIcs";
import { isInsideQuietHours } from "../src/lib/planner/notifications";

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
console.log("RUNNING SUITE: Phase 7 Planner & Group Projects Tests");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Deadline Risk Score Tests
// ---------------------------------------------------------------------------
console.log("--- 1. Deadline Risk Score Formula Tests ---");

// Normal: weight 20, 0% progress, 2 days left => 20 * 1 / 2 = 10.0
{
  const base = new Date("2026-11-10T10:00:00Z");
  const due = new Date("2026-11-12T10:00:00Z"); // exactly 2 days
  const res = calculateDeadlineRiskScore(20, 0, due, base);
  assertEqual(res.riskScore, 10.0, "Risk score for weight 20, 0% progress, 2 days left is 10.0");
  assertEqual(res.urgencyLevel, "HIGH", "Urgency level is HIGH for 2 days left");
}

// 50% Progress: weight 20, progress 50 (or 0.5), 2 days left => 20 * 0.5 / 2 = 5.0
{
  const base = new Date("2026-11-10T10:00:00Z");
  const due = new Date("2026-11-12T10:00:00Z");
  const res = calculateDeadlineRiskScore(20, 50, due, base);
  assertEqual(res.riskScore, 5.0, "Risk score halves when progress reaches 50%");
}

// 100% Progress: fully submitted => risk score is 0.0
{
  const base = new Date("2026-11-10T10:00:00Z");
  const due = new Date("2026-11-11T10:00:00Z");
  const res = calculateDeadlineRiskScore(30, 100, due, base);
  assertEqual(res.riskScore, 0.0, "Completed deliverable has exactly 0.0 risk score");
  assertEqual(res.urgencyLevel, "LOW", "Completed deliverable urgency is LOW");
}

// Overdue deadline: days left <= 0 => critical urgency, safe divisor
{
  const base = new Date("2026-11-15T10:00:00Z");
  const pastDue = new Date("2026-11-14T10:00:00Z");
  const res = calculateDeadlineRiskScore(25, 0, pastDue, base);
  assertTrue(res.riskScore > 0, "Overdue deliverable returns non-zero positive penalty score");
  assertEqual(res.urgencyLevel, "CRITICAL", "Overdue deliverable has CRITICAL urgency");
  assertTrue(!isNaN(res.riskScore), "No division by zero NaN errors");
}

// ---------------------------------------------------------------------------
// 2. Natural Language Quick Add Parser Tests
// ---------------------------------------------------------------------------
console.log("\n--- 2. Natural Language Quick Add Parser Tests ---");

{
  const base = new Date("2026-11-09T10:00:00Z"); // Monday
  const parsed = parseNaturalLanguageAssignment("Marketing deck due Friday 5pm, 10 slides", base);
  assertTrue(parsed.title.toLowerCase().includes("marketing"), "Title contains Marketing");
  assertEqual(parsed.matchedSubjectCode, "MKT502", "Subject correctly inferred as MKT502");
  assertEqual(parsed.deliverableFormat, "10 slides", "Deliverable format parsed as 10 slides");

  const parsedDate = new Date(parsed.deadline);
  assertEqual(parsedDate.getDay(), 5, "Due date falls on Friday");
  assertEqual(parsedDate.getHours(), 17, "Due hour is 17:00 (5:00 PM)");
}

{
  const base = new Date("2026-11-09T10:00:00Z");
  const parsed = parseNaturalLanguageAssignment("Corporate Finance case memo due tomorrow at 11:59pm", base);
  assertEqual(parsed.matchedSubjectCode, "FIN601", "Corporate Finance maps to FIN601");
  const parsedDate = new Date(parsed.deadline);
  assertEqual(parsedDate.getDate(), 10, "Tomorrow is the 10th");
  assertEqual(parsedDate.getHours(), 23, "Hours is 23");
  assertEqual(parsedDate.getMinutes(), 59, "Minutes is 59");
}

// ---------------------------------------------------------------------------
// 3. Assignment Brief Extraction Tests
// ---------------------------------------------------------------------------
console.log("\n--- 3. Assignment Brief & Rubric Extraction Tests ---");

{
  const briefText = `
    Term Case 2: Valuation of Target Corp
    Please submit a maximum of 5 pages PDF memo.
    All models must use 1.5 line spacing and Times New Roman font.
    Checklist:
    - Executive Summary with target recommendation
    - WACC calculation and cost of equity breakdown
    - Synergies valuation sensitivity table
  `;
  const extracted = extractAssignmentBrief(briefText);
  assertEqual(extracted.pageOrWordLimit, "5 pages", "Page limit extracted as 5 pages");
  assertTrue(extracted.formatRules.some((r) => r.includes("PDF")), "PDF rule identified");
  assertTrue(extracted.checklist.length >= 3, "Extracted at least 3 checklist items");
  assertTrue(
    extracted.checklist.some((c) => c.item.toLowerCase().includes("wacc")),
    "WACC calculation in checklist"
  );
}

// ---------------------------------------------------------------------------
// 4. iCalendar (.ics) Feed Generator Tests
// ---------------------------------------------------------------------------
console.log("\n--- 4. iCalendar (.ics) Feed Generator Tests ---");

{
  const sampleEvents: CalendarEvent[] = [
    {
      id: "ev-1",
      title: "Class: FIN601 Corporate Finance",
      type: "CLASS",
      start: new Date("2026-11-10T04:00:00Z"),
      end: new Date("2026-11-10T05:30:00Z"),
      location: "CR-201, Academic Block",
    },
    {
      id: "ev-2",
      title: "[DEADLINE] MKT502 Marketing Deck",
      type: "DEADLINE",
      start: new Date("2026-11-13T11:30:00Z"),
      end: new Date("2026-11-13T12:00:00Z"),
    },
  ];

  const ics = generateIcsFeed("You Inc. Schedule", sampleEvents);
  assertTrue(ics.includes("BEGIN:VCALENDAR"), "Contains BEGIN:VCALENDAR header");
  assertTrue(ics.includes("END:VCALENDAR"), "Contains END:VCALENDAR footer");
  assertTrue(ics.includes("SUMMARY:Class: FIN601 Corporate Finance"), "Contains class event summary");
  assertTrue(ics.includes("LOCATION:CR-201\\, Academic Block"), "Location is properly escaped");
  assertTrue(ics.includes("CATEGORIES:DEADLINE"), "Category tag present");
}

// ---------------------------------------------------------------------------
// 5. Quiet Hours & Notification Window Tests
// ---------------------------------------------------------------------------
console.log("\n--- 5. Quiet Hours (Do Not Disturb) Protocol Tests ---");

{
  // Window: 22:00 to 08:00 (crosses midnight)
  const nightTime1 = new Date("2026-11-10T23:30:00");
  const nightTime2 = new Date("2026-11-10T04:15:00");
  const dayTime1 = new Date("2026-11-10T14:30:00");
  const dayTime2 = new Date("2026-11-10T09:00:00");

  assertEqual(isInsideQuietHours(nightTime1, "22:00", "08:00"), true, "23:30 is inside quiet hours");
  assertEqual(isInsideQuietHours(nightTime2, "22:00", "08:00"), true, "04:15 is inside quiet hours");
  assertEqual(isInsideQuietHours(dayTime1, "22:00", "08:00"), false, "14:30 is outside quiet hours");
  assertEqual(isInsideQuietHours(dayTime2, "22:00", "08:00"), false, "09:00 is outside quiet hours");
}

console.log("\n=======================================================");
console.log("ALL 16 PLANNER & GROUP PROJECT TESTS PASSED SUCCESSFULLY!");
console.log("=======================================================\n");
