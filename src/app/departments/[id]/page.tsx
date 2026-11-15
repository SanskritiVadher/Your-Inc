import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { DepartmentDetailClient } from "./DepartmentDetailClient";

export const dynamic = "force-dynamic";

export default async function DepartmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
    include: {
      term: true,
      professor: true,
      evaluationComponents: { orderBy: { createdAt: "asc" } },
      concepts: {
        orderBy: { createdAt: "asc" },
        include: {
          cards: { select: { id: true } },
        },
      },
      decks: { orderBy: { sessionNumber: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      assignments: { orderBy: { deadline: "asc" } },
      memories: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!subject) {
    notFound();
  }

  // Fetch all user subjects for top ticker tape
  const allUserSubjects = await prisma.subject.findMany({
    where: { userId: subject.userId },
    select: {
      id: true,
      name: true,
      code: true,
      sharePrice: true,
    },
  });

  const tickerItems = allUserSubjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems}>
      <DepartmentDetailClient initialSubject={subject} />
    </AppShell>
  );
}
