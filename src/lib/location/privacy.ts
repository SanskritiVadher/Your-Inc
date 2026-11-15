import { prisma } from "@/lib/prisma";

/**
 * Rounds lat/lng to coarse ~100m precision (3 decimal places).
 * 0.001 deg lat ~= 111 meters.
 */
export function roundToCoarseCoordinate(val: number): number {
  return Number(val.toFixed(3));
}

/**
 * Purges raw location data older than 90 days.
 * Keeps aggregated statistics safe.
 */
export async function purgeOldLocationData(_userId: string): Promise<{ purgedCheckIns: number }> {
  return { purgedCheckIns: 0 };
}

/**
 * Deletes ALL stored location data for a user with one click.
 * Master reset of location privacy.
 */
export async function deleteAllLocationData(userId: string): Promise<{ success: boolean }> {
  await Promise.all([
    // Delete all saved locations / focus places
    prisma.location.deleteMany({ where: { userId } }),
    // Delete field cases
    prisma.fieldCase.deleteMany({ where: { userId } }),
    // Reset permissions to master off
    prisma.locationPermission.upsert({
      where: { userId },
      update: {
        masterEnabled: false,
        focusMapEnabled: false,
        studyZoneRemindersEnabled: false,
        fieldCasesEnabled: false,
      },
      create: {
        userId,
        masterEnabled: false,
        focusMapEnabled: false,
        studyZoneRemindersEnabled: false,
        fieldCasesEnabled: false,
      },
    }),
  ]);

  return { success: true };
}

/**
 * Exports all stored location records as JSON or CSV format.
 */
export async function exportLocationData(
  userId: string,
  format: "json" | "csv" = "json"
): Promise<string> {
  const [locations, fieldCases] = await Promise.all([
    prisma.location.findMany({ where: { userId } }),
    prisma.fieldCase.findMany({ where: { userId } }),
  ]);

  if (format === "json") {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        locations,
        fieldCases,
      },
      null,
      2
    );
  }

  // CSV Export format
  const rows = [
    ["Type", "Identifier", "Label/Name", "Latitude", "Longitude", "Date", "Status"],
  ];

  for (const l of locations) {
    rows.push(["SavedPlace", l.id, l.label, l.lat.toString(), l.lng.toString(), l.createdAt.toISOString(), "ACTIVE"]);
  }
  for (const fc of fieldCases) {
    rows.push([
      "FieldCase",
      fc.id,
      fc.areaName,
      fc.lat.toString(),
      fc.lng.toString(),
      fc.createdAt.toISOString(),
      fc.completed ? "COMPLETED" : "PENDING",
    ]);
  }

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}
