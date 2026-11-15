import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authCookie = cookies().get("auth_user_id")?.value;
    let user = null;

    if (authCookie) {
      user = await prisma.user.findUnique({
        where: { id: authCookie },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
