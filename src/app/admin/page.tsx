import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { computeAdminCohortMetrics } from "@/lib/analytics/posthog";
import { getAiCostAnalytics } from "@/lib/feedback/feedbackManager";
import { getAllFeatureFlags } from "@/lib/flags/featureFlags";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  const [metrics, aiCost, featureFlags, feedbacks, users, cohorts] = await Promise.all([
    computeAdminCohortMetrics(),
    getAiCostAnalytics(),
    getAllFeatureFlags(),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        creditRating: true,
        reviewsCount: true,
        createdAt: true,
        firstReviewCompletedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.cohort.findMany({
      include: {
        members: true,
        sharedDecks: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const initialData = {
    metrics,
    aiCost,
    featureFlags,
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      type: f.type,
      content: f.content,
      aiRating: f.aiRating,
      ratingReason: f.ratingReason,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      user: f.user,
    })),
    users,
    cohorts: cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      program: c.program,
      year: c.year,
      inviteCode: c.inviteCode,
      memberCount: c.members.length,
      sharedDeckCount: c.sharedDecks.length,
      monthlyAiCap: c.monthlyAiCap,
    })),
  };

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <AdminDashboardClient initialData={initialData} />
    </AppShell>
  );
}
