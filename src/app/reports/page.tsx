import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { QuarterlyResultsView } from "@/components/economy/QuarterlyResultsView";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await prisma.user.findFirst({ include: { subjects: true } });
  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <QuarterlyResultsView />
    </AppShell>
  );
}
