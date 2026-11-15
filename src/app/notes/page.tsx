import React from "react";
import AppShell from "@/components/layout/AppShell";
import { NotesClient } from "./NotesClient";
import { DateOverridePill } from "@/components/dev/DateOverridePill";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await prisma.user.findFirst({
    include: {
      subjects: {
        include: {
          concepts: { select: { id: true, name: true, subjectId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      notes: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
          concept: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  const subjects = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
  }));

  const concepts = (user?.subjects || []).flatMap((s) => s.concepts);

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <span className="font-body text-xs text-sindoor font-semibold">
            Study Notebook
          </span>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Class Notes & Observations
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Capture case analyses, framework diagrams, and professor takeaways. Convert notes directly into practice flashcards.
          </p>
        </div>

        <NotesClient
          initialNotes={user?.notes || []}
          subjects={subjects}
          concepts={concepts}
        />
      </div>

      <DateOverridePill />
    </AppShell>
  );
}
