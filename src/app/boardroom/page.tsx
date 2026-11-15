import React from "react";
import AppShell from "@/components/layout/AppShell";
import { BoardroomClient } from "./BoardroomClient";
import { DateOverridePill } from "@/components/dev/DateOverridePill";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

interface BoardroomPageProps {
  searchParams?: {
    tab?: string;
  };
}

export default async function BoardroomPage({ searchParams }: BoardroomPageProps) {
  const activeTab = searchParams?.tab || "tutor";

  const user = await prisma.user.findFirst({
    include: {
      subjects: {
        include: {
          decks: { select: { id: true, title: true, subjectId: true } },
        },
        orderBy: { createdAt: "asc" },
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

  const subjects = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
  }));

  const decks = (user?.subjects || []).flatMap((s) => s.decks);

  // Calculate consumed AI budget today
  const effectiveNow = user ? await getEffectiveDate(user.id) : new Date();
  const startOfDay = new Date(effectiveNow);
  startOfDay.setHours(0, 0, 0, 0);

  const callsToday = user
    ? await prisma.aiCall.findMany({
        where: {
          userId: user.id,
          timestamp: { gte: startOfDay },
        },
        select: { cost: true },
      })
    : [];

  const consumedCost = callsToday.reduce((sum, c) => sum + (c.cost || 0), 0);
  const dailyBudget = user?.dailyAiBudgetCost ?? 0.50;

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <span className="font-body text-xs text-sindoor font-semibold">
            Study Assistant
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl text-text font-normal mt-1">
            AI Tutor
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Ask questions grounded in your course decks, practice case discussions, grade practice answers, and review topics.
          </p>
        </div>

        <BoardroomClient
          initialTab={activeTab}
          subjects={subjects}
          decks={decks}
          dailyBudgetCost={dailyBudget}
          consumedBudgetCost={consumedCost}
        />
      </div>

      <DateOverridePill />
    </AppShell>
  );
}
