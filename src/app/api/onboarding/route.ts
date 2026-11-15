import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      program = "MBA",
      specialization = "",
      semester = 1,
      currentTerm,
      subjects = [],
    } = body;

    // 1. Resolve Clerk User ID
    let clerkUserId: string | null = null;

    try {
      const clerkAuth = auth();
      if (clerkAuth?.userId) {
        clerkUserId = clerkAuth.userId;
      }
    } catch (err) {}

    if (!clerkUserId) {
      clerkUserId = cookies().get("clerk_user_id")?.value || null;
    }

    if (!clerkUserId && body.clerkId) {
      clerkUserId = body.clerkId;
    }

    let user = null;

    if (clerkUserId) {
      user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });
    }

    if (!user) {
      const authCookie = cookies().get("auth_user_id")?.value;
      if (authCookie) {
        user = await prisma.user.findUnique({
          where: { id: authCookie },
        });
        if (user) {
          clerkUserId = user.clerkId;
        }
      }
    }

    const userName = name && name.trim() ? name.trim() : (user?.name || "Student");
    const termLabel = currentTerm || `Semester ${semester || 1}`;

    if (!user) {
      const finalClerkId = clerkUserId || `user_${Date.now()}`;
      user = await prisma.user.create({
        data: {
          clerkId: finalClerkId,
          email: `${userName.toLowerCase().replace(/\s+/g, ".")}@mba.edu`,
          name: userName,
          companyName: "You Inc.",
          program: program || "MBA",
          specialization: specialization || null,
          currentTerm: termLabel,
          creditRating: "AAA",
          sharePrice: 0.0,
          totalValuation: 0.0,
          onboardingCompleted: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userName,
          companyName: "You Inc.",
          program: program || user.program || "MBA",
          specialization: specialization || user.specialization || null,
          currentTerm: termLabel,
          onboardingCompleted: true,
        },
      });
    }

    // Refresh cookies
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

    // Create Term record for this user
    let term = await prisma.term.findFirst({
      where: {
        userId: user.id,
        name: termLabel,
      },
    });

    if (!term) {
      await prisma.term.updateMany({
        where: { userId: user.id },
        data: { isCurrent: false },
      });

      term = await prisma.term.create({
        data: {
          userId: user.id,
          name: termLabel,
          isCurrent: true,
        },
      });
    }

    // Create Subjects strictly for THIS user
    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const subj of subjects) {
        const subjName = typeof subj === "string" ? subj.trim() : subj?.name?.trim();
        if (!subjName) continue;

        const code = (
          (typeof subj === "object" && subj?.code) ||
          subjName.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase() ||
          "SUB"
        );

        const existingSubj = await prisma.subject.findFirst({
          where: {
            userId: user.id,
            name: subjName,
          },
        });

        if (!existingSubj) {
          await prisma.subject.create({
            data: {
              userId: user.id,
              termId: term.id,
              name: subjName,
              code,
              credits: 3,
              sharePrice: 0.0,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to complete setup" },
      { status: 500 }
    );
  }
}
