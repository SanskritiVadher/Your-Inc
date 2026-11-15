import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider = "google", email, name, isFresh } = body;

    let user;

    if (isFresh) {
      // Create a fresh test user with a unique clerk ID and onboardingCompleted: false
      const freshTimestamp = Date.now();
      const freshName = name || "Sanskriti Vadher";
      const freshEmail = email || `sanskriti.${freshTimestamp}@gmail.com`;
      const freshClerkId = `user_fresh_${freshTimestamp}`;

      user = await prisma.user.create({
        data: {
          clerkId: freshClerkId,
          email: freshEmail,
          name: freshName,
          companyName: "You Inc.",
          creditRating: "AAA",
          sharePrice: 0.0,
          totalValuation: 0.0,
          onboardingCompleted: false,
        },
      });
    } else if (email) {
      // Find existing user or create a new user with that email
      user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkId: `user_${Date.now()}`,
            email,
            name: name || email.split("@")[0],
            companyName: "You Inc.",
            creditRating: "AAA",
            sharePrice: 0.0,
            totalValuation: 0.0,
            onboardingCompleted: false,
          },
        });
      }
    } else {
      // Default Google sign-in: find the primary user or check onboarding state
      user = await prisma.user.findFirst({
        orderBy: { updatedAt: "desc" },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkId: `user_google_${Date.now()}`,
            email: "sanskriti.vadher@gmail.com",
            name: "Sanskriti Vadher",
            companyName: "You Inc.",
            creditRating: "AAA",
            sharePrice: 0.0,
            totalValuation: 0.0,
            onboardingCompleted: false,
          },
        });
      }
    }

    // Set auth cookie
    cookies().set("auth_user_id", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err: unknown) {
    console.error("Sign-in error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign-in failed" },
      { status: 500 }
    );
  }
}
