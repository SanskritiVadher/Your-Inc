import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider = "google", email, name, isFresh, isDemo } = body;

    let user;

    if (isDemo) {
      // Demo account login
      user = await prisma.user.findFirst({
        where: { clerkId: "user_local_dev_ceo" },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkId: "user_local_dev_ceo",
            email: "demo@youinc.study",
            name: "Demo Student",
            companyName: "You Inc.",
            program: "MBA",
            specialization: "General Management",
            currentTerm: "Semester 1",
            creditRating: "AAA",
            sharePrice: 0.0,
            totalValuation: 0.0,
            onboardingCompleted: true,
          },
        });
      }
    } else if (isFresh) {
      // Fresh unique user
      const freshTimestamp = Date.now();
      const freshClerkId = `user_fresh_${freshTimestamp}`;
      const freshName = name || "New Student";
      const freshEmail = email || `student_${freshTimestamp}@mba.edu`;

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
      // Sign in by email
      user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        const timestamp = Date.now();
        user = await prisma.user.create({
          data: {
            clerkId: `user_${timestamp}`,
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
      // Google sign-in: find existing by email or create a fresh account
      const timestamp = Date.now();
      const freshEmail = email || `student_${timestamp}@gmail.com`;
      const existingUser = email ? await prisma.user.findFirst({ where: { email } }) : null;

      if (existingUser) {
        user = existingUser;
      } else {
        user = await prisma.user.create({
          data: {
            clerkId: `user_google_${timestamp}`,
            email: freshEmail,
            name: name || "Google Student",
            companyName: "You Inc.",
            creditRating: "AAA",
            sharePrice: 0.0,
            totalValuation: 0.0,
            onboardingCompleted: false,
          },
        });
      }
    }

    // Set auth cookies for session tracking
    cookies().set("auth_user_id", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    cookies().set("clerk_user_id", user.clerkId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      user: {
        id: user.id,
        clerkId: user.clerkId,
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
