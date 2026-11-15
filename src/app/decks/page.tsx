import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { DecksOverviewClient } from "./DecksOverviewClient";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const user = await getCurrentUser();

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  const decks = await prisma.deck.findMany({
    where: { userId: user?.id || "" },
    include: {
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: { sessionNumber: "asc" },
  });

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <DecksOverviewClient
        initialDecks={decks}
        subjects={user?.subjects || []}
      />
    </AppShell>
  );
}
