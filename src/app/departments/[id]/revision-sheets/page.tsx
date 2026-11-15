import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { getOrGenerateRevisionSheet, RevisionSheetData } from "@/lib/revision/revisionSheetService";
import { CombinedRevisionSheetsClient } from "@/components/decks/CombinedRevisionSheetsClient";

export const dynamic = "force-dynamic";

export default async function CombinedRevisionSheetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: subjectId } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      term: true,
      user: true,
      decks: {
        orderBy: [{ sessionNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!subject) {
    notFound();
  }

  const sheets: RevisionSheetData[] = [];
  for (const deck of subject.decks) {
    try {
      const sheet = await getOrGenerateRevisionSheet(deck.id);
      sheets.push(sheet);
    } catch (e) {
      console.error(`Error loading sheet for deck ${deck.id}:`, e);
    }
  }

  return (
    <AppShell userCompanyName={subject.user?.companyName || "You Inc."}>
      <CombinedRevisionSheetsClient
        subject={{
          id: subject.id,
          name: subject.name,
          code: subject.code,
          termName: subject.term?.name || "Semester 1",
        }}
        sheets={sheets}
      />
    </AppShell>
  );
}
