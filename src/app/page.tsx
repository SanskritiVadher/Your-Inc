import React from "react";
import Link from "next/link";
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
  Plus,
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

  // User's subjects with deck and concept counts for mastery calculation
  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    include: {
      decks: { select: { id: true } },
      concepts: { select: { value: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Continue where you left off (last opened deck + slide)
  let continueDeck: {
    id: string;
    title: string;
    slideNumber: number;
    totalSlides: number;
    subjectName?: string;
    subjectCode?: string;
  } | null = null;

  const lastDeckCookie = cookies().get("last_opened_deck")?.value;
  if (lastDeckCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(lastDeckCookie));
      if (parsed?.deckId) {
        const deckRecord = await prisma.deck.findFirst({
          where: { id: parsed.deckId, subject: { userId: user.id } },
          include: { subject: { select: { name: true, code: true } } },
        });
        if (deckRecord) {
          continueDeck = {
            id: deckRecord.id,
            title: deckRecord.title,
            slideNumber: Math.max(1, parsed.slideNumber || 1),
            totalSlides: parsed.totalSlides || deckRecord.slideCount || 1,
            subjectName: deckRecord.subject.name,
            subjectCode: deckRecord.subject.code,
          };
        }
      }
    } catch {}
  }

  if (!continueDeck && deckCount > 0) {
    const recentDeck = await prisma.deck.findFirst({
      where: { subject: { userId: user.id } },
      orderBy: { updatedAt: "desc" },
      include: {
        subject: { select: { name: true, code: true } },
      },
    });
    if (recentDeck) {
      continueDeck = {
        id: recentDeck.id,
        title: recentDeck.title,
        slideNumber: 1,
        totalSlides: recentDeck.slideCount || 1,
        subjectName: recentDeck.subject.name,
        subjectCode: recentDeck.subject.code,
      };
    }
  }

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

  const hasCareer = Boolean(user.targetRoles?.length > 0 || user.placementStartDate);
  const hasCohort = Boolean(user.cohortMembers?.length > 0);
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
      <div className="space-y-8 w-full max-w-[960px] mx-auto py-6">
        {/* 5. Thin block-print geometric border strip in haldi + mehendi at 30% opacity */}
        <div className="w-full overflow-hidden select-none opacity-30 -mb-4" aria-hidden="true">
          <svg
            viewBox="0 0 600 12"
            className="w-full h-3"
            preserveAspectRatio="repeat-x"
          >
            <pattern id="todayBlockPrint" width="24" height="12" patternUnits="userSpaceOnUse">
              <polygon points="12,1 23,6 12,11 1,6" fill="var(--color-primary, #5B6B2E)" />
              <polygon points="12,3 19,6 12,9 5,6" fill="var(--color-haldi, #C8962E)" />
              <circle cx="12" cy="6" r="1" fill="#F7F1E5" />
              <circle cx="0" cy="6" r="0.8" fill="var(--color-primary, #5B6B2E)" />
              <circle cx="24" cy="6" r="0.8" fill="var(--color-primary, #5B6B2E)" />
            </pattern>
            <rect width="100%" height="12" fill="url(#todayBlockPrint)" />
          </svg>
        </div>

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

        {/* 2. Your subjects row */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-normal text-text">Your subjects</h2>
            {subjects.length > 0 && (
              <Link href="/departments" className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-body">
                <span>View all</span>
                <ArrowRight size={11} />
              </Link>
            )}
          </div>

          {subjects.length === 0 ? (
            <Link
              href="/departments"
              className="block p-4 rounded-lg border border-dashed border-border/80 bg-surface/40 hover:bg-surface/80 hover:border-primary/40 transition-colors text-center group"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-body font-medium text-text-muted group-hover:text-primary transition-colors">
                <Plus size={16} />
                <span>Add a subject</span>
              </div>
              <p className="text-xs text-text-muted mt-1 font-body">
                Organize your course syllabus, lecture decks, and flashcards.
              </p>
            </Link>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((s) => {
                const sDeckCount = s.decks.length;
                const sMastery = s.concepts.length > 0
                  ? Math.round(s.concepts.reduce((sum, c) => sum + c.value, 0) / s.concepts.length)
                  : 0;

                return (
                  <Link
                    key={s.id}
                    href={`/departments/${s.id}`}
                    className="p-3.5 rounded-lg border border-border/70 bg-surface hover:border-primary/50 hover:bg-surface/90 transition-all shadow-2xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted mb-1 font-body">
                        <span className="font-medium text-primary uppercase tracking-wider">{s.code}</span>
                        <span className="text-text-muted">{sDeckCount} {sDeckCount === 1 ? "deck" : "decks"}</span>
                      </div>
                      <h3 className="font-body text-sm font-medium text-text group-hover:text-primary transition-colors line-clamp-1">
                        {s.name}
                      </h3>
                    </div>
                    <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-xs font-body text-text-muted">
                      <span>Mastery</span>
                      <span className="font-medium text-haldi">{sMastery}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Continue where you left off (hidden when not available) */}
        {continueDeck && (
          <div className="p-4 rounded-lg border border-border/80 bg-surface/70 space-y-2 font-body">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-body text-text-muted uppercase tracking-wider font-medium">
                Continue where you left off
              </span>
              <span className="text-xs text-text-muted font-body">
                Slide {continueDeck.slideNumber} of {continueDeck.totalSlides}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-text line-clamp-1">
                  {continueDeck.title}
                </h3>
                {continueDeck.subjectName && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {continueDeck.subjectCode ? `${continueDeck.subjectCode} · ` : ""}{continueDeck.subjectName}
                  </p>
                )}
              </div>
              <Link
                href={`/decks/${continueDeck.id}?slide=${continueDeck.slideNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-xs font-medium shrink-0"
              >
                <span>Resume</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* 4. Main Action Button Logic */}
        {deckCount === 0 ? (
          /* Cards due = 0 and no decks -> button "Upload your first deck" */
          <div className="space-y-3">
            <div>
              <Link
                href="/decks"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded bg-primary text-white dark:text-[#1A1714] font-body text-sm font-medium hover:bg-primary/90 transition-colors shadow-2xs whitespace-nowrap"
              >
                <Upload size={16} />
                <span>Upload your first deck</span>
              </Link>
            </div>
            <p className="text-xs text-text-muted font-body">
              Drop in a lecture slide deck (PDF or PowerPoint) to generate your first study cards and summary notes.
            </p>
          </div>
        ) : dueCardsCount === 0 ? (
          /* Decks exist but 0 due -> text "All caught up" + quiet button "Review anyway" */
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-body font-medium text-text-muted">
              All caught up
            </span>
            <Link
              href="/review"
              className="inline-flex items-center justify-center px-5 py-2 rounded border border-border/80 bg-surface/80 hover:bg-surface text-text font-body text-xs font-medium transition-colors shadow-2xs whitespace-nowrap"
            >
              Review anyway
            </Link>
          </div>
        ) : (
          /* Cards due > 0 -> button "Begin" */
          <div>
            <Link
              href="/review"
              className="inline-flex items-center justify-center px-8 py-3 rounded bg-primary text-white dark:text-[#1A1714] font-body text-sm font-medium hover:bg-primary/90 transition-colors shadow-2xs whitespace-nowrap"
            >
              Begin
            </Link>
          </div>
        )}

        {/* 5. Below: Due soon, Fading topics, Today's news */}
        {deckCount > 0 && (
          <div className="space-y-4 pt-2">
            {/* Card 1: Due soon (hidden if empty) */}
            {dueSoonAssignments.length > 0 && (
              <div className="p-4 rounded-lg border border-border/80 bg-surface space-y-3 font-body">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center space-x-2">
                    <Calendar size={15} className="text-primary" />
                    <h2 className="text-sm font-medium text-text">Due soon</h2>
                  </div>
                  <Link
                    href="/planner"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
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
                    <TrendingDown size={15} className="text-haldi" />
                    <h2 className="text-sm font-medium text-text">Fading topics</h2>
                  </div>
                  <Link
                    href="/review?mode=weakest_first"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
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

            {/* Card 3: Today's news with border to 10% opacity and Mukta dates */}
            {topNews.length > 0 && (
              <div className="p-4 rounded-lg border border-text/10 bg-surface space-y-3 font-body">
                <div className="flex items-center justify-between pb-2 border-b border-text/10">
                  <div className="flex items-center space-x-2">
                    <BookOpen size={15} className="text-primary" />
                    <h2 className="text-sm font-medium text-text">Today&apos;s news</h2>
                  </div>
                  <Link
                    href="/news"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>All news</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {topNews.map((item) => (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-text-muted font-body">
                        <span>{item.source}</span>
                        <span className="font-body font-normal">
                          {new Date(item.pubDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text hover:text-primary transition-colors block line-clamp-1 font-body"
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
