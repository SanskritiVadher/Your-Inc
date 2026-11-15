import { prisma } from "@/lib/prisma";

export const DEFAULT_FEATURE_FLAGS = [
  { key: "boardroom_ai", description: "Ask (AI Tutor)", enabled: true },
  { key: "location_features", description: "Campus Map & Focus", enabled: false },
  { key: "field_cases", description: "OpenStreetMap Real-World Micro-Cases", enabled: false },
  { key: "cohort", description: "Cohort & Class Groups", enabled: false },
  { key: "career", description: "Career Vault & Mock Interviews", enabled: false },
  { key: "news", description: "Daily News & Current Affairs", enabled: false },
  { key: "blind_spots", description: "Blind Spots Calibration", enabled: false },
  { key: "formula_sheet", description: "Formula Sheet & Drills", enabled: false },
  { key: "framework_finder", description: "Framework Finder", enabled: false },
  { key: "sounds", description: "Page Turn Sound Effects", enabled: false },
  { key: "solar_widget", description: "Solar Widget", enabled: false },
  { key: "dev_time_machine", description: "Dev Time Machine", enabled: false },
  { key: "shared_deck_library", description: "Cohort Shared Slide Decks", enabled: false },
  { key: "public_proof", description: "Public Proof Profile Pages", enabled: false },
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
      update: {
        enabled: flag.enabled,
      },
    });
  }
}

/**
 * Checks if a specific feature flag is currently active.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const defaultFlag = DEFAULT_FEATURE_FLAGS.find((f) => f.key === key);
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
  });

  if (!flag) return defaultFlag ? defaultFlag.enabled : false;
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
