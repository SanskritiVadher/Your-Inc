import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        companyName: true,
        username: true,
        publicProofEnabled: true,
        proofSettings: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const defaultSettings = {
      showSkills: true,
      showTrends: true,
      showProjects: true,
      showIpoSubjects: true,
      showQuarterlyConsistency: true,
    };

    const finalSettings = user.proofSettings
      ? { ...defaultSettings, ...(user.proofSettings as object) }
      : defaultSettings;

    return NextResponse.json({
      username: user.username,
      publicProofEnabled: user.publicProofEnabled,
      proofSettings: finalSettings,
      proofUrl: user.username ? `/u/${user.username}` : null,
    });
  } catch (err: unknown) {
    console.error("Public proof GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load public proof settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, username: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { username, publicProofEnabled, proofSettings } = body;

    // Validate username if changing
    let cleanUsername = user.username;
    if (username !== undefined) {
      const sanitized = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (sanitized.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 alphanumeric characters" },
          { status: 400 }
        );
      }

      // Check uniqueness if changed
      if (sanitized !== user.username) {
        const existing = await prisma.user.findUnique({
          where: { username: sanitized },
        });
        if (existing && existing.id !== user.id) {
          return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
        }
        cleanUsername = sanitized;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: cleanUsername,
        publicProofEnabled:
          typeof publicProofEnabled === "boolean" ? publicProofEnabled : undefined,
        proofSettings: proofSettings !== undefined ? proofSettings : undefined,
      },
      select: {
        username: true,
        publicProofEnabled: true,
        proofSettings: true,
      },
    });

    return NextResponse.json({
      username: updated.username,
      publicProofEnabled: updated.publicProofEnabled,
      proofSettings: updated.proofSettings,
      proofUrl: updated.username ? `/u/${updated.username}` : null,
    });
  } catch (err: unknown) {
    console.error("Public proof POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update public proof settings" },
      { status: 500 }
    );
  }
}
