import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { getOrGenerateRevisionSheet } from "@/lib/revision/revisionSheetService";
import { RevisionSheetView } from "@/components/decks/RevisionSheetView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DeckRevisionSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      subject: {
        include: { user: true },
      },
    },
  });

  if (!deck) {
    notFound();
  }

  const sheet = await getOrGenerateRevisionSheet(deck.id);

  return (
    <AppShell userCompanyName={deck.subject.user?.companyName || "You Inc."}>
      <div className="space-y-4">
        <div className="print:hidden">
          <Link
            href={`/decks/${deck.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-body text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Deck Slides</span>
          </Link>
        </div>
        <RevisionSheetView sheet={sheet} subjectId={deck.subjectId} />
      </div>
    </AppShell>
  );
}
