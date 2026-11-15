import React from "react";
import AppShell from "@/components/layout/AppShell";
import { CalmReviewWorkspace } from "@/components/review/CalmReviewWorkspace";
import { DateOverridePill } from "@/components/dev/DateOverridePill";
import { prisma } from "@/lib/prisma";
import { getEffectiveDate } from "@/lib/fsrs";

export const dynamic = "force-dynamic";

interface ReviewPageProps {
  searchParams?: {
    mode?: string;
    subjectId?: string;
    deckId?: string;
  };
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const mode = searchParams?.mode || "all";
  const subjectId = searchParams?.subjectId || "";
  const deckId = searchParams?.deckId || "";

  const user = await prisma.user.findFirst({
    include: {
      subjects: {
        orderBy: { createdAt: "asc" },
      },
      targetRoles: { take: 1 },
      cohortMembers: { take: 1 },
      locationPermission: true,
    },
  });

  const effectiveNow = user ? await getEffectiveDate(user.id) : new Date();

  // Cards query
  const whereClause: Record<string, unknown> = {
    concept: {
      subject: {
        userId: user?.id || "",
        ...(subjectId ? { id: subjectId } : {}),
      },
    },
    ...(deckId ? { sourceSlide: { deckId } } : {}),
  };

  const rawCards = user
    ? await prisma.card.findMany({
        where: whereClause,
        include: {
          concept: {
            select: {
              id: true,
              name: true,
              value: true,
              subject: { select: { id: true, name: true, code: true } },
            },
          },
          sourceSlide: {
            select: { id: true, number: true, deckId: true },
          },
        },
        orderBy: { due: "asc" },
      })
    : [];

  const dueCards = [];
  const newCards = [];
  for (const c of rawCards) {
    if (c.state === 0 || c.reps === 0) {
      newCards.push(c);
    } else if (new Date(c.due) <= effectiveNow) {
      dueCards.push(c);
    }
  }

  // Focus: Calm session capped to ~12 cards (~8 min)
  const dailyLimit = 12;
  let queue = [...dueCards, ...newCards.slice(0, 4)].slice(0, dailyLimit);
  if (queue.length === 0 && rawCards.length > 0) {
    queue = rawCards.slice(0, 10);
  }

  if (mode === "weakest_first") {
    queue.sort((a, b) => a.concept.value - b.concept.value);
  }

  const subjectsList = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
  }));

  const hasCareer = Boolean(user && (user.targetRoles.length > 0 || user.placementStartDate));
  const hasCohort = Boolean(user && user.cohortMembers.length > 0);
  const locationEnabled = Boolean(user?.locationPermission?.masterEnabled);

  return (
    <AppShell
      userCompanyName={user?.companyName || "You Inc."}
      userName={user?.name || "Student"}
      creditRating={user?.creditRating || "AAA"}
      isAdmin={user?.isAdmin || false}
      locationEnabled={locationEnabled}
      hasCohort={hasCohort}
      hasCareer={hasCareer}
    >
      <CalmReviewWorkspace
        initialCards={queue as any}
        subjects={subjectsList}
        subjectId={subjectId}
      />
      <DateOverridePill />
    </AppShell>
  );
}
