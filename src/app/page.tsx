import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { DateOverridePill } from "@/components/dev/DateOverridePill";
import { getEffectiveDate } from "@/lib/fsrs";
import {
  Calendar,
  ArrowRight,
  TrendingDown,
  BookOpen,
  Upload,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();

  const effectiveNow = await getEffectiveDate(user.id);
  const totalDeadlines = await prisma.assignment.count({
    where: { subject: { userId: user.id } },
  });
  const deckCount = await prisma.deck.count({
    where: { subject: { userId: user.id } },
  });

  // Calculate real due card count for today
  const dueCardsCount = await prisma.card.count({
    where: {
      concept: { subject: { userId: user.id } },
      OR: [
        { state: 0 },
        { reps: 0 },
        { due: { lte: effectiveNow } },
      ],
    },
  });

  // Estimated time: ~8 minutes default calm session
  const estimatedMin = dueCardsCount === 0 ? 0 : Math.min(15, Math.max(5, Math.round(dueCardsCount * 0.6)));

  // Due soon assignments (max 3)
  const dueSoonAssignments = await prisma.assignment.findMany({
    where: {
      subject: { userId: user.id },
      status: { not: "GRADED" },
    },
    include: {
      subject: { select: { name: true, code: true } },
    },
    orderBy: { deadline: "asc" },
    take: 3,
  });

  // Fading topics (max 3)
  const fadingTopics = await prisma.concept.findMany({
    where: { subject: { userId: user.id } },
    include: {
      subject: { select: { name: true, code: true } },
    },
    orderBy: { value: "asc" },
    take: 3,
  });

  // Today's news (max 3)
  const topNews = await prisma.newsItem.findMany({
    orderBy: { pubDate: "desc" },
    take: 3,
  });

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name ? user.name.split(" ")[0] : "Student";

  const hasCareer = Boolean(user.targetRoles.length > 0 || user.placementStartDate);
  const hasCohort = Boolean(user.cohortMembers.length > 0);
  const locationEnabled = Boolean(user.locationPermission?.masterEnabled);

  return (
    <AppShell
      userCompanyName="You Inc."
      userName={user.name || "Student"}
      creditRating={user.creditRating || "AAA"}
      totalDeadlines={totalDeadlines}
      isAdmin={user.isAdmin || false}
      locationEnabled={locationEnabled}
      hasCohort={hasCohort}
      hasCareer={hasCareer}
      deckCount={deckCount}
    >
      <div className="space-y-8 max-w-2xl mx-auto py-8">
        {/* 1. Greeting */}
        <header className="space-y-1.5 text-left">
          <h1 className="font-handwriting text-3xl sm:text-4xl text-text leading-tight">
            {`${timeGreeting}, ${firstName}`}
          </h1>
          <p className="text-sm text-text-muted font-body">
            {deckCount === 0
              ? "Welcome to your study notebook."
              : dueCardsCount > 0
              ? `${dueCardsCount} cards · about ${estimatedMin || 8} minutes`
              : "0 cards · all caught up"}
          </p>
        </header>

        {/* 2. Main Action */}
        {deckCount === 0 ? (
          /* Empty state after onboarding: One action to upload first deck */
          <div className="space-y-4">
            <div>
              <Link
                href="/decks"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded bg-cobalt text-white dark:text-[#141B2D] font-body text-sm font-medium hover:bg-cobalt/90 transition-colors shadow-2xs whitespace-nowrap"
              >
                <Upload size={16} />
                <span>Upload your first class deck</span>
              </Link>
            </div>
            <p className="text-xs text-text-muted font-body">
              Drop in a lecture slide deck (PDF or PowerPoint) to generate your first study cards and summary notes.
            </p>
          </div>
        ) : (
          /* Normal state: One button "Begin" */
          <div>
            <Link
              href="/review"
              className="inline-flex items-center justify-center px-8 py-3 rounded bg-cobalt text-white dark:text-[#141B2D] font-body text-sm font-medium hover:bg-cobalt/90 transition-colors shadow-2xs whitespace-nowrap"
            >
              Begin
            </Link>
          </div>
        )}

        {/* 3. Below: up to 3 small cards (Due soon, Fading topics, Today's news). Hide any card with nothing in it. */}
        {deckCount > 0 && (
          <div className="space-y-4 pt-2">
            {/* Card 1: Due soon (hidden if empty) */}
            {dueSoonAssignments.length > 0 && (
              <div className="p-4 rounded-lg border border-border/80 bg-surface space-y-3 font-body">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center space-x-2">
                    <Calendar size={15} className="text-cobalt" />
                    <h2 className="text-sm font-medium text-text">Due soon</h2>
                  </div>
                  <Link
                    href="/planner"
                    className="text-xs text-cobalt hover:underline inline-flex items-center gap-1"
                  >
                    <span>Plan</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                <div className="space-y-2">
                  {dueSoonAssignments.map((a) => (
                    <div key={a.id} className="flex items-baseline justify-between text-xs">
                      <div className="min-w-0 pr-3 truncate">
                        <span className="text-text-muted font-medium">{a.subject.code} · </span>
                        <span className="text-text">{a.title}</span>
                      </div>
                      <span className="text-text-muted shrink-0 tabular-nums">
                        {new Date(a.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 2: Fading topics (hidden if empty) */}
            {fadingTopics.length > 0 && (
              <div className="p-4 rounded-lg border border-border/80 bg-surface space-y-3 font-body">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center space-x-2">
                    <TrendingDown size={15} className="text-turmeric" />
                    <h2 className="text-sm font-medium text-text">Fading topics</h2>
                  </div>
                  <Link
                    href="/review?mode=weakest_first"
                    className="text-xs text-cobalt hover:underline inline-flex items-center gap-1"
                  >
                    <span>Review</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                <div className="space-y-2">
                  {fadingTopics.map((topic) => (
                    <div key={topic.id} className="flex items-baseline justify-between text-xs">
                      <div className="min-w-0 pr-3 truncate">
                        <span className="text-text-muted font-medium">{topic.subject.code} · </span>
                        <span className="text-text">{topic.name}</span>
                      </div>
                      <span className="text-text-muted shrink-0 tabular-nums font-medium">
                        {Math.round(topic.value)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 3: Today's news (hidden if empty) */}
            {topNews.length > 0 && (
              <div className="p-4 rounded-lg border border-border/80 bg-surface space-y-3 font-body">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center space-x-2">
                    <BookOpen size={15} className="text-leaf" />
                    <h2 className="text-sm font-medium text-text">Today&apos;s news</h2>
                  </div>
                  <Link
                    href="/news"
                    className="text-xs text-cobalt hover:underline inline-flex items-center gap-1"
                  >
                    <span>All news</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {topNews.map((item) => (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>{item.source}</span>
                        <span className="tabular-nums">
                          {new Date(item.pubDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text hover:text-cobalt transition-colors block line-clamp-1"
                      >
                        {item.title}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dev Tools: hidden */}
        <DateOverridePill isAdmin={false} />
      </div>
    </AppShell>
  );
}
