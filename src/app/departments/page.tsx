import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { DepartmentsClient } from "./DepartmentsClient";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const currentUser = await getCurrentUser();
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      terms: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      subjects: {
        include: {
          professor: true,
          decks: { select: { id: true } },
          concepts: {
            select: {
              value: true,
              cards: { select: { id: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const subjects = (user?.subjects || []).map((s) => {
    const deckCount = s.decks?.length || 0;
    const cardsCount = s.concepts?.reduce((acc, c) => acc + (c.cards?.length || 0), 0) || 0;
    const mastery = s.concepts?.length
      ? Math.round(s.concepts.reduce((acc, c) => acc + c.value, 0) / s.concepts.length)
      : 0;

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      sharePrice: s.sharePrice,
      termId: s.termId,
      deckCount,
      cardsCount,
      mastery,
      professor: s.professor ? { name: s.professor.name } : null,
    };
  });

  const terms = (user?.terms || []).map((t) => ({
    id: t.id,
    name: t.name,
    isCurrent: t.isCurrent,
    isArchived: t.isArchived,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    order: t.order,
  }));

  const tickerItems = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <DepartmentsClient terms={terms} initialSubjects={subjects} />
    </AppShell>
  );
}
