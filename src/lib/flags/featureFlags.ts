import { prisma } from "@/lib/prisma";

export const DEFAULT_FEATURE_FLAGS = [
  { key: "boardroom_ai", description: "Boardroom Socratic Chat & Cold Call Drills", enabled: true },
  { key: "location_features", description: "Geofenced Classroom Attendance & Focus Map", enabled: true },
  { key: "field_cases", description: "OpenStreetMap Real-World Micro-Cases", enabled: true },
  { key: "group_projects", description: "Collaborative Project Workspaces & Tasks", enabled: true },
  { key: "mock_interviews", description: "Executive Placement Mock Interview Drills", enabled: true },
  { key: "public_proof", description: "Public Proof Profile Pages (/u/[username])", enabled: true },
  { key: "shared_deck_library", description: "Cohort Shared Slide Decks", enabled: true },
];

/**
 * Initializes default feature flags in the database if not present.
 */
export async function ensureDefaultFeatureFlags() {
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: {
        key: flag.key,
        description: flag.description,
        enabled: flag.enabled,
      },
      update: {},
    });
  }
}

/**
 * Checks if a specific feature flag is currently active.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
  });

  if (!flag) return true; // default open if unconfigured
  return flag.enabled;
}

/**
 * Toggles a runtime feature flag.
 */
export async function setFeatureFlagState(key: string, enabled: boolean) {
  return await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled },
    update: { enabled },
  });
}

/**
 * Returns all feature flags.
 */
export async function getAllFeatureFlags() {
  await ensureDefaultFeatureFlags();
  return await prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
  });
}
