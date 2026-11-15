import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createCohort,
  joinCohortByCode,
  shareDeckWithCohort,
  adoptSharedDeckForMember,
} from "@/lib/cohort/cohortManager";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await prisma.cohortMember.findMany({
      where: { userId: user.id },
      include: {
        cohort: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, creditRating: true } } },
            },
            sharedDecks: {
              include: {
                deck: { select: { id: true, title: true, slideCount: true, subject: { select: { code: true, name: true } } } },
                sharedBy: { select: { name: true } },
              },
            },
            timetableEntries: true,
            deadlines: true,
          },
        },
      },
    });

    const hiddenItems = await prisma.hiddenCohortItem.findMany({
      where: { userId: user.id },
    });
    const hiddenSet = new Set(hiddenItems.map((h) => h.itemId));

    const cohorts = memberships.map((m) => {
      const c = m.cohort;
      const isAdmin = c.adminId === user.id || m.role === "Admin";
      return {
        id: c.id,
        name: c.name,
        program: c.program,
        year: c.year,
        inviteCode: c.inviteCode,
        inviteLinkExpiry: c.inviteLinkExpiry,
        maxMembers: c.maxMembers,
        monthlyAiCap: c.monthlyAiCap,
        isAdmin,
        membersCount: c.members.length,
        members: c.members.map((mem) => ({
          userId: mem.userId,
          name: mem.user.name,
          role: mem.role,
          creditRating: mem.user.creditRating,
          joinedAt: mem.joinedAt,
        })),
        sharedDecks: c.sharedDecks.map((sd) => ({
          id: sd.id,
          deckId: sd.deckId,
          title: sd.deck.title,
          slideCount: sd.deck.slideCount,
          subjectCode: sd.deck.subject.code,
          sharedBy: sd.sharedBy.name,
          sharedAt: sd.sharedAt,
        })),
        timetable: c.timetableEntries.filter((t) => !hiddenSet.has(t.id)),
        deadlines: c.deadlines.filter((d) => !hiddenSet.has(d.id)),
      };
    });

    return NextResponse.json({ cohorts });
  } catch (err: unknown) {
    console.error("Cohorts GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
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

    // 1. Create a new Cohort
    if (action === "create") {
      const { name, program = "MBA", year = 2026, maxMembers = 100, monthlyAiCap = 50.0 } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Class name is required" }, { status: 400 });
      }

      const cohort = await createCohort({
        name,
        program,
        year: Number(year),
        maxMembers: Number(maxMembers),
        monthlyAiCap: Number(monthlyAiCap),
        adminUserId: user.id,
      });

      return NextResponse.json({ cohort });
    }

    // 2. Join a Cohort via Invite Code
    if (action === "join") {
      const { inviteCode } = body;
      if (!inviteCode?.trim()) {
        return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
      }

      const result = await joinCohortByCode(user.id, inviteCode);
      return NextResponse.json(result);
    }

    // 3. Regenerate Invite Code (Admin only)
    if (action === "regenerate_code") {
      const { cohortId } = body;
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort || cohort.adminId !== user.id) {
        return NextResponse.json({ error: "Unauthorized: only class admin can regenerate invite link" }, { status: 403 });
      }

      const newCode = nanoid(8).toUpperCase();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      const updated = await prisma.cohort.update({
        where: { id: cohortId },
        data: { inviteCode: newCode, inviteLinkExpiry: newExpiry },
      });

      return NextResponse.json({ cohort: updated });
    }

    // 4. Remove Cohort Member (Admin only)
    if (action === "remove_member") {
      const { cohortId, targetUserId } = body;
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort || cohort.adminId !== user.id) {
        return NextResponse.json({ error: "Unauthorized: only class admin can remove members" }, { status: 403 });
      }

      await prisma.cohortMember.delete({
        where: { cohortId_userId: { cohortId, userId: targetUserId } },
      });

      return NextResponse.json({ success: true });
    }

    // 5. Share Processed Deck with Cohort
    if (action === "share_deck") {
      const { deckId, cohortId, noticeAccepted } = body;
      if (!deckId || !cohortId || !noticeAccepted) {
        return NextResponse.json(
          { error: "Must confirm deck is for enrolled section students only" },
          { status: 400 }
        );
      }

      const shared = await shareDeckWithCohort(deckId, cohortId, user.id, noticeAccepted);
      return NextResponse.json({ shared });
    }

    // 6. Adopt Shared Deck into Student's Private Flashcard Queue
    if (action === "adopt_deck") {
      const { deckId } = body;
      if (!deckId) return NextResponse.json({ error: "Deck ID required" }, { status: 400 });

      const adopted = await adoptSharedDeckForMember(deckId, user.id);
      return NextResponse.json(adopted);
    }

    // 7. Add Common Cohort Deadline (Admin only)
    if (action === "add_deadline") {
      const { cohortId, title, subjectCode, dueDate, weight = 20.0, format = "Report" } = body;
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort || cohort.adminId !== user.id) {
        return NextResponse.json({ error: "Unauthorized: only class admin can add deadlines" }, { status: 403 });
      }

      const deadline = await prisma.cohortDeadline.create({
        data: {
          cohortId,
          title: title.trim(),
          subjectCode: subjectCode.trim(),
          dueDate: new Date(dueDate),
          weight: Number(weight),
          format,
        },
      });

      return NextResponse.json({ deadline });
    }

    // 8. Member Hide Cohort Item
    if (action === "hide_item") {
      const { itemId, itemType } = body;
      if (!itemId || !itemType) return NextResponse.json({ error: "Item parameters required" }, { status: 400 });

      await prisma.hiddenCohortItem.upsert({
        where: { userId_itemId: { userId: user.id, itemId } },
        create: { userId: user.id, itemId, itemType },
        update: {},
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Cohorts POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
