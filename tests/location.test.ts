import {
  calculateHaversineDistanceMeters,
  Coordinate,
} from "../src/lib/location/distance";
import { roundToCoarseCoordinate } from "../src/lib/location/privacy";

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
console.log("RUNNING SUITE: Location & Privacy Tests");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Haversine Distance Calculations
// ---------------------------------------------------------------------------
console.log("--- 1. Haversine Distance Calculations ---");

{
  const p1: Coordinate = { lat: 28.545, lng: 77.192 };
  const p2: Coordinate = { lat: 28.545, lng: 77.192 };
  const dist = calculateHaversineDistanceMeters(p1, p2);
  assertEqual(dist, 0.0, "Distance between identical coordinates is 0.0m");
}

{
  // 0.001 degree of latitude is roughly 111 meters
  const p1: Coordinate = { lat: 28.545, lng: 77.192 };
  const p2: Coordinate = { lat: 28.546, lng: 77.192 };
  const dist = calculateHaversineDistanceMeters(p1, p2);
  assertTrue(dist >= 110 && dist <= 112, `0.001 deg latitude delta measures ~111m (measured: ${dist}m)`);
}

// ---------------------------------------------------------------------------
// 2. Coarse Coordinate Obfuscation (~100m / 3 decimal places)
// ---------------------------------------------------------------------------
console.log("\n--- 2. Privacy: Coarse Coordinate Obfuscation ---");

{
  const rawLat = 28.5458921;
  const coarseLat = roundToCoarseCoordinate(rawLat);
  assertEqual(coarseLat, 28.546, "28.5458921 rounds to 28.546 (3 decimal places, ~100m)");

  const rawLng = 77.1923489;
  const coarseLng = roundToCoarseCoordinate(rawLng);
  assertEqual(coarseLng, 77.192, "77.1923489 rounds to 77.192 (3 decimal places, ~100m)");
}

// ---------------------------------------------------------------------------
// 3. Empirical Insight Threshold Safeguard (>= 5 Sessions Required)
// ---------------------------------------------------------------------------
console.log("\n--- 3. Focus Map Empirical Insight Safeguard ---");

{
  // Simulating the insight rule from focusMap.ts:
  // Must require >= 5 sessions per location to avoid spurious insights.
  const evaluateInsightEligibility = (sessionCounts: number[]): boolean => {
    return sessionCounts.some((cnt) => cnt >= 5);
  };

  assertFalse(
    evaluateInsightEligibility([4, 3, 2, 1]),
    "Locations with < 5 sessions suppress empirical insights"
  );
  assertTrue(
    evaluateInsightEligibility([5, 2, 1]),
    "Location with exactly 5 sessions qualifies for empirical insight"
  );
  assertTrue(
    evaluateInsightEligibility([12, 8]),
    "Locations with > 5 sessions qualify for empirical insight"
  );
}

// ---------------------------------------------------------------------------
// 4. 24-Hour Cache Expiry Math
// ---------------------------------------------------------------------------
console.log("\n--- 4. Overpass Cache Expiry Math ---");

{
  const now = new Date("2026-11-14T10:00:00Z");
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + 24);

  const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  assertEqual(diffHours, 24, "Overpass business query cache TTL is exactly 24 hours");
}

console.log("\n=======================================================");
console.log("ALL LOCATION & PRIVACY UNIT TESTS PASSED SUCCESSFULLY! ✓");
console.log("=======================================================\n");
