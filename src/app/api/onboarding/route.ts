import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    const authCookie = cookies().get("auth_user_id")?.value;
    let user = null;

    if (authCookie) {
      user = await prisma.user.findUnique({
        where: { id: authCookie },
      });
    }

    if (!user && body.clerkId) {
      user = await prisma.user.findUnique({
        where: { clerkId: body.clerkId },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        orderBy: { updatedAt: "desc" },
      });
    }

    const userName = name && name.trim() ? name.trim() : (user?.name || "Student");
    const termLabel = currentTerm || `Semester ${semester || 1}`;

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: `user_${Date.now()}`,
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

    // Set or refresh auth cookie
    cookies().set("auth_user_id", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Create or find Term record
    let term = await prisma.term.findFirst({
      where: {
        userId: user.id,
        name: termLabel,
      },
    });

    if (!term) {
      // Unset other terms as current if any
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

    // Create Subjects if provided
    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const subj of subjects) {
        const subjName = typeof subj === "string" ? subj.trim() : subj?.name?.trim();
        if (!subjName) continue;

        const code = (
          (typeof subj === "object" && subj?.code) ||
          subjName.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase() ||
          "SUB"
        );

        // Check if subject already exists
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
