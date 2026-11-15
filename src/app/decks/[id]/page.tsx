import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { DeckDetailClient } from "./DeckDetailClient";

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const deck = await prisma.deck.findUnique({
    where: { id: params.id },
    include: {
      subject: { select: { id: true, name: true, code: true, sharePrice: true } },
      slides: {
        orderBy: { number: "asc" },
        include: {
          cards: true,
          questions: true,
        },
      },
    },
  });

  if (!deck) {
    notFound();
  }

  // Fetch all user subjects for top ticker
  const userSubjects = await prisma.subject.findMany({
    where: { userId: deck.userId || "" },
    select: { id: true, name: true, code: true, sharePrice: true },
  });

  const tickerItems = userSubjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems}>
      <DeckDetailClient initialDeck={deck} />
    </AppShell>
  );
}
