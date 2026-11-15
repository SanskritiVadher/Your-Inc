import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSquadConglomerate } from "@/lib/economy/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true, companyName: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find the user's squad membership
    const membership = await prisma.squadMember.findFirst({
      where: { userId: user.id },
      include: { squad: true },
    });

    if (!membership) {
      // Find or return default/available squad for user to explore
      const defaultSquad = await prisma.squad.findFirst({
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({
        inSquad: false,
        availableSquad: defaultSquad ? { id: defaultSquad.id, name: defaultSquad.name, code: defaultSquad.code } : null,
      });
    }

    const squadData = await getSquadConglomerate(membership.squadId);

    // Also get cohort-wide takeover leaderboard (squads competing to recover the most depreciated value)
    const cohortTakeoverBids = await prisma.squad.findMany({
      select: {
        id: true,
        name: true,
        conglomerateIndex: true,
        weeklyRecoveredValue: true,
        _count: { select: { members: true } },
      },
      orderBy: { weeklyRecoveredValue: "desc" },
      take: 5,
    });

    return NextResponse.json({
      inSquad: true,
      currentMember: {
        id: membership.id,
        role: membership.role,
        isPublic: membership.isPublic,
        activityLevel: membership.activityLevel,
        weeklyContribution: membership.weeklyContribution,
      },
      squad: squadData,
      takeoverBids: cohortTakeoverBids.map((b) => ({
        id: b.id,
        name: b.name,
        conglomerateIndex: b.conglomerateIndex,
        weeklyRecoveredValue: b.weeklyRecoveredValue,
        memberCount: b._count.members,
      })),
    });
  } catch (err: unknown) {
    console.error("Squad API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load squad" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === "toggle_opt_in") {
      const membership = await prisma.squadMember.findFirst({
        where: { userId: user.id },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a member of any squad" }, { status: 400 });
      }

      const updated = await prisma.squadMember.update({
        where: { id: membership.id },
        data: { isPublic: !membership.isPublic },
      });

      return NextResponse.json({ success: true, isPublic: updated.isPublic });
    }

    if (action === "join" || action === "create") {
      let squadId = body.squadId;

      if (action === "create") {
        const name = body.name || "Study Syndicate";
        const code = `SQ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const newSquad = await prisma.squad.create({
          data: {
            name,
            code,
            conglomerateIndex: 65.0,
            weeklyRecoveredValue: 12.5,
          },
        });
        squadId = newSquad.id;
      } else if (body.code) {
        const found = await prisma.squad.findUnique({
          where: { code: body.code.trim().toUpperCase() },
        });
        if (!found) {
          return NextResponse.json({ error: "Squad not found with this code" }, { status: 404 });
        }
        squadId = found.id;
      }

      // Check current member count (capped at 6)
      const count = await prisma.squadMember.count({ where: { squadId } });
      if (count >= 6) {
        return NextResponse.json({ error: "Squad syndicate is full (maximum 6 members)" }, { status: 400 });
      }

      // Upsert membership
      const membership = await prisma.squadMember.upsert({
        where: {
          squadId_userId: {
            squadId,
            userId: user.id,
          },
        },
        create: {
          squadId,
          userId: user.id,
          role: action === "create" ? "Syndicate Lead" : "Partner",
          activityLevel: "High",
          weeklyContribution: 0.0,
          isPublic: false,
        },
        update: {
          squadId,
        },
      });

      const updatedSquad = await getSquadConglomerate(squadId);
      return NextResponse.json({ success: true, membership, squad: updatedSquad });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Squad action error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process squad action" },
      { status: 500 }
    );
  }
}
