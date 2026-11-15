import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const semesterId = searchParams.get("semesterId");
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type") || "all";
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const user = await getApiCurrentUser();
    if (!user) {
      return NextResponse.json({ items: [], semesters: [], subjects: [] });
    }

    // Fetch all semesters and subjects for filters
    const semesters = await prisma.term.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isCurrent: true, isArchived: true },
    });

    const subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, termId: true },
    });

    // Build subject filter
    const subjectWhere: Record<string, unknown> = { userId: user.id };
    if (subjectId) {
      subjectWhere.id = subjectId;
    }
    if (semesterId) {
      subjectWhere.termId = semesterId;
    }

    const items: Array<{
      id: string;
      type: "deck" | "note" | "project" | "topic" | "assignment";
      title: string;
      subtitle: string;
      semesterId?: string;
      semesterName: string;
      subjectId?: string;
      subjectName: string;
      subjectCode: string;
      date: string;
      url: string;
      isSignature?: boolean;
      scoreOrValue?: number;
    }> = [];

    // 1. Decks
    if (type === "all" || type === "deck") {
      const decks = await prisma.deck.findMany({
        where: {
          subject: subjectWhere,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        include: {
          subject: {
            include: { term: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

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
    }

    // 2. Notes
    if (type === "all" || type === "note") {
      const notes = await prisma.note.findMany({
        where: {
          subject: subjectWhere,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { content: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          subject: {
            include: { term: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

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
    }

    // 3. Projects
    if (type === "all" || type === "project") {
      const projects = await prisma.project.findMany({
        where: {
          userId: user.id,
          ...(semesterId ? { termId: semesterId } : {}),
          ...(subjectId ? { subjectId } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { tools: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          term: true,
          subject: true,
        },
        orderBy: [{ isSignature: "desc" }, { createdAt: "desc" }],
      });

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
    }

    // 4. Topics (Concepts)
    if (type === "all" || type === "topic") {
      const concepts = await prisma.concept.findMany({
        where: {
          subject: subjectWhere,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { definition: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          subject: {
            include: { term: true },
          },
          _count: { select: { cards: true } },
        },
        orderBy: { value: "desc" },
      });

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
    }

    // 5. Assignments
    if (type === "all" || type === "assignment") {
      const assignments = await prisma.assignment.findMany({
        where: {
          subject: subjectWhere,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        include: {
          subject: {
            include: { term: true },
          },
        },
        orderBy: { deadline: "asc" },
      });

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
    }

    // Sort items: signature projects always come first!
    items.sort((a, b) => {
      if (a.isSignature && !b.isSignature) return -1;
      if (!a.isSignature && b.isSignature) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({
      items,
      semesters,
      subjects,
      totalCount: items.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load library items" },
      { status: 500 }
    );
  }
}
