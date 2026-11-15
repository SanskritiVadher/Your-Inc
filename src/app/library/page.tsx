import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { LibraryClient } from "@/components/library/LibraryClient";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const currentUser = await getCurrentUser();
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      terms: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, isCurrent: true, isArchived: true },
      },
      subjects: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, termId: true, sharePrice: true },
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

  // Fetch initial library items across all semesters
  const [decks, notes, projects, concepts, assignments] = await Promise.all([
    prisma.deck.findMany({
      where: { subject: { userId: user?.id } },
      include: { subject: { include: { term: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.findMany({
      where: { subject: { userId: user?.id } },
      include: { subject: { include: { term: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId: user?.id },
      include: { term: true, subject: true },
      orderBy: [{ isSignature: "desc" }, { createdAt: "desc" }],
    }),
    prisma.concept.findMany({
      where: { subject: { userId: user?.id } },
      include: {
        subject: { include: { term: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { value: "desc" },
    }),
    prisma.assignment.findMany({
      where: { subject: { userId: user?.id } },
      include: { subject: { include: { term: true } } },
      orderBy: { deadline: "asc" },
    }),
  ]);

  const items: any[] = [];

  for (const d of decks) {
    items.push({
      id: d.id,
      type: "deck",
      title: d.title,
      subtitle: `Session ${d.sessionNumber || "—"} · ${d.slideCount} slides`,
      semesterId: d.subject.term?.id,
      semesterName: d.subject.term?.name || "Semester 1",
      subjectId: d.subject.id,
      subjectName: d.subject.name,
      subjectCode: d.subject.code,
      date: d.createdAt.toISOString(),
      url: `/decks/${d.id}?mode=book`,
    });
  }

  for (const n of notes) {
    items.push({
      id: n.id,
      type: "note",
      title: n.title,
      subtitle: n.content.slice(0, 100) + (n.content.length > 100 ? "…" : ""),
      semesterId: n.subject.term?.id,
      semesterName: n.subject.term?.name || "Semester 1",
      subjectId: n.subject.id,
      subjectName: n.subject.name,
      subjectCode: n.subject.code,
      date: n.createdAt.toISOString(),
      url: `/notes`,
    });
  }

  for (const p of projects) {
    items.push({
      id: p.id,
      type: "project",
      title: p.title,
      subtitle: p.impactSummary || p.outcome || p.description.slice(0, 100),
      semesterId: p.term?.id,
      semesterName: p.term?.name || "Semester 1",
      subjectId: p.subject?.id,
      subjectName: p.subject?.name || "General Portfolio",
      subjectCode: p.subject?.code || "VAULT",
      date: p.createdAt.toISOString(),
      url: `/career`,
      isSignature: p.isSignature,
    });
  }

  for (const c of concepts) {
    items.push({
      id: c.id,
      type: "topic",
      title: c.name,
      subtitle: `${c._count.cards} cards · ${c.definition.slice(0, 90)}…`,
      semesterId: c.subject.term?.id,
      semesterName: c.subject.term?.name || "Semester 1",
      subjectId: c.subject.id,
      subjectName: c.subject.name,
      subjectCode: c.subject.code,
      date: c.createdAt.toISOString(),
      url: `/departments/${c.subject.id}`,
      scoreOrValue: Math.round(c.value),
    });
  }

  for (const a of assignments) {
    items.push({
      id: a.id,
      type: "assignment",
      title: a.title,
      subtitle: `Weight: ${a.weight}% · Status: ${a.status.toLowerCase()}`,
      semesterId: a.subject.term?.id,
      semesterName: a.subject.term?.name || "Semester 1",
      subjectId: a.subject.id,
      subjectName: a.subject.name,
      subjectCode: a.subject.code,
      date: a.deadline.toISOString(),
      url: `/planner`,
    });
  }

  // Sort: Signature projects first, then by date desc
  items.sort((a, b) => {
    if (a.isSignature && !b.isSignature) return -1;
    if (!a.isSignature && b.isSignature) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <LibraryClient
        initialItems={items}
        semesters={user?.terms || []}
        subjects={user?.subjects || []}
      />
    </AppShell>
  );
}
