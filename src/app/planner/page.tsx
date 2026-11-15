import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PlannerContainerClient } from "@/components/planner/PlannerContainerClient";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const currentUser = await getCurrentUser();
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      subjects: true,
      notificationSettings: true,
    },
  });

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell
      tickerItems={tickerItems}
      userCompanyName={user?.companyName || "You Inc."}
      creditRating={user?.creditRating || "AAA"}
    >
      <PlannerContainerClient />
    </AppShell>
  );
}
