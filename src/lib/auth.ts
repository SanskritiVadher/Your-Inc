import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Server-side helper to get the currently authenticated user in pages / Server Components.
 * Uses Clerk auth() -> clerkId -> User record.
 * If not authenticated, redirects to /sign-in.
 * If no User row exists in DB, redirects to /onboarding.
 */
export async function getCurrentUser(options?: { allowUnonboarded?: boolean }) {
  let clerkUserId: string | null = null;

  // 1. Clerk server auth
  try {
    const clerkAuth = await auth();
    if (clerkAuth?.userId) {
      clerkUserId = clerkAuth.userId;
    }
  } catch (err) {
    // Thrown if Clerk is not mounted or key is invalid
  }

  // 2. Cookie fallback (clerk_user_id or auth_user_id)
  if (!clerkUserId) {
    clerkUserId = cookies().get("clerk_user_id")?.value || null;
  }

  if (!clerkUserId) {
    const authCookie = cookies().get("auth_user_id")?.value;
    if (authCookie) {
      const userByCookie = await prisma.user.findUnique({
        where: { id: authCookie },
      });
      if (userByCookie) {
        clerkUserId = userByCookie.clerkId;
      }
    }
  }

  // If not signed in at all, redirect to /sign-in
  if (!clerkUserId) {
    redirect("/sign-in");
  }

  // Look up user by clerkId
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    include: {
      subjects: { orderBy: { createdAt: "asc" } },
      targetRoles: { take: 1 },
      cohortMembers: { take: 1 },
      locationPermission: true,
    },
  });

  // If no User row exists, redirect to onboarding
  if (!user) {
    redirect("/onboarding");
  }

  // If onboarding not completed, redirect to onboarding unless specifically allowed
  if (!user.onboardingCompleted && !options?.allowUnonboarded) {
    redirect("/onboarding");
  }

  return user;
}

/**
 * API route helper to get the currently authenticated user.
 * Returns null if not authenticated (instead of calling redirect()).
 */
export async function getApiCurrentUser(options?: { allowUnonboarded?: boolean }) {
  let clerkUserId: string | null = null;

  try {
    const clerkAuth = await auth();
    if (clerkAuth?.userId) {
      clerkUserId = clerkAuth.userId;
    }
  } catch (err) {}

  if (!clerkUserId) {
    clerkUserId = cookies().get("clerk_user_id")?.value || null;
  }

  if (!clerkUserId) {
    const authCookie = cookies().get("auth_user_id")?.value;
    if (authCookie) {
      const userByCookie = await prisma.user.findUnique({
        where: { id: authCookie },
      });
      if (userByCookie) {
        clerkUserId = userByCookie.clerkId;
      }
    }
  }

  if (!clerkUserId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    include: {
      subjects: { orderBy: { createdAt: "asc" } },
      targetRoles: { take: 1 },
      cohortMembers: { take: 1 },
      locationPermission: true,
    },
  });

  if (!user) return null;
  if (!user.onboardingCompleted && !options?.allowUnonboarded) return null;

  return user;
}
