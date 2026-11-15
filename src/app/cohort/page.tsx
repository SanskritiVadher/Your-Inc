import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { CohortHubClient } from "@/components/cohort/CohortHubClient";

export const dynamic = "force-dynamic";

export default async function CohortPage() {
  const user = await prisma.user.findFirst({
    include: {
      subjects: true,
      cohortMembers: {
        include: {
          cohort: {
            include: {
              members: { include: { user: { select: { id: true, name: true, email: true, creditRating: true } } } },
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
      },
    },
  });

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  const hiddenItems = user
    ? await prisma.hiddenCohortItem.findMany({ where: { userId: user.id } })
    : [];
  const hiddenSet = new Set(hiddenItems.map((h) => h.itemId));

  const cohorts = (user?.cohortMembers || []).map((m) => {
    const c = m.cohort;
    const isAdmin = c.adminId === user?.id || m.role === "Admin";
    return {
      id: c.id,
      name: c.name,
      program: c.program,
      year: c.year,
      inviteCode: c.inviteCode,
      inviteLinkExpiry: c.inviteLinkExpiry ? c.inviteLinkExpiry.toISOString() : null,
      maxMembers: c.maxMembers,
      monthlyAiCap: c.monthlyAiCap,
      isAdmin,
      membersCount: c.members.length,
      members: c.members.map((mem) => ({
        userId: mem.userId,
        name: mem.user.name,
        role: mem.role,
        creditRating: mem.user.creditRating,
        joinedAt: mem.joinedAt.toISOString(),
      })),
      sharedDecks: c.sharedDecks.map((sd) => ({
        id: sd.id,
        deckId: sd.deckId,
        title: sd.deck.title,
        slideCount: sd.deck.slideCount,
        subjectCode: sd.deck.subject.code,
        sharedBy: sd.sharedBy.name,
        sharedAt: sd.sharedAt.toISOString(),
      })),
      timetable: c.timetableEntries
        .filter((t) => !hiddenSet.has(t.id))
        .map((t) => ({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          subjectCode: t.subjectCode,
          subjectName: t.subjectName,
          room: t.room,
        })),
      deadlines: c.deadlines
        .filter((d) => !hiddenSet.has(d.id))
        .map((d) => ({
          id: d.id,
          title: d.title,
          subjectCode: d.subjectCode,
          dueDate: d.dueDate.toISOString(),
          weight: d.weight,
          format: d.format,
        })),
    };
  });

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <CohortHubClient cohorts={cohorts} />
    </AppShell>
  );
}
