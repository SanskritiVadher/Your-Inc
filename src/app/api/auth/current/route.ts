import { NextResponse } from "next/server";
import { getApiCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getApiCurrentUser({ allowUnonboarded: true });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
