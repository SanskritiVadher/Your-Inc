import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { SemestersSettingsView } from "@/components/settings/SemestersSettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      terms: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          subjects: {
            select: {
              id: true,
              name: true,
              code: true,
              sharePrice: true,
              keepFresh: true,
              _count: {
                select: {
                  decks: true,
                  concepts: true,
                  notes: true,
                  assignments: true,
                },
              },
            },
          },
          _count: {
            select: {
              subjects: true,
              projects: true,
            },
          },
        },
      },
      subjects: {
        select: { id: true, name: true, code: true, sharePrice: true },
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

  const semesters = (user?.terms || []).map((t) => ({
    id: t.id,
    name: t.name,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    isCurrent: t.isCurrent,
    isArchived: t.isArchived,
    order: t.order,
    wrapUp: t.wrapUp,
    subjects: t.subjects,
    _count: t._count,
  }));

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <div className="max-w-4xl mx-auto py-2">
        <SemestersSettingsView
          initialSemesters={semesters}
          initialBlindSpotsEnabled={user?.blindSpotsEnabled ?? true}
        />
      </div>
    </AppShell>
  );
}
