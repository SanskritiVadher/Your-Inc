import React from "react";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { MemoryVaultClient } from "./MemoryVaultClient";

export const dynamic = "force-dynamic";

export default async function MemoryVaultPage() {
  const user = await prisma.user.findFirst({
    include: {
      subjects: { select: { id: true, name: true, code: true, sharePrice: true } },
    },
  });

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  const initialMemories = await prisma.memoryEntry.findMany({
    where: { userId: user?.id || "" },
    include: {
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <MemoryVaultClient
        initialMemories={initialMemories}
        subjects={user?.subjects || []}
      />
    </AppShell>
  );
}
