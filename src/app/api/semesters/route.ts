import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ semesters: [] });
    }

    const terms = await prisma.term.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            sharePrice: true,
            keepFresh: true,
            _count: {
              select: {
                decks: true,
                concepts: true,
                notes: true,
                assignments: true,
              },
            },
          },
        },
        _count: {
          select: {
            subjects: true,
            projects: true,
          },
        },
      },
    });

    return NextResponse.json({ semesters: terms });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load semesters" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, startDate, endDate, isCurrent } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Semester name is required" }, { status: 400 });
    }

    // Get max order
    const maxTerm = await prisma.term.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (maxTerm?.order || 0) + 1;

    // If marked current, unmark other terms
    if (isCurrent) {
      await prisma.term.updateMany({
        where: { userId: user.id },
        data: { isCurrent: false },
      });
    }

    const created = await prisma.term.create({
      data: {
        userId: user.id,
        name: name.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: Boolean(isCurrent),
        order: nextOrder,
        isArchived: false,
      },
      include: {
        subjects: true,
      },
    });

    return NextResponse.json({ semester: created }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create semester" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { id, action, name, startDate, endDate, isCurrent, order, reorderedIds } = body;

    if (action === "reorder" && Array.isArray(reorderedIds)) {
      // Batch reorder
      for (let i = 0; i < reorderedIds.length; i++) {
        await prisma.term.update({
          where: { id: reorderedIds[i] },
          data: { order: i + 1 },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Semester ID is required" }, { status: 400 });
    }

    // Action: Close Semester (Generate 1-page wrap-up)
    if (action === "close") {
      const term = await prisma.term.findUnique({
        where: { id },
        include: {
          subjects: {
            include: {
              concepts: {
                orderBy: { value: "desc" },
                take: 5,
                select: { id: true, name: true, value: true },
              },
              decks: {
                orderBy: { sessionNumber: "asc" },
                take: 3,
                select: { id: true, title: true, slideCount: true, sessionNumber: true },
              },
            },
          },
          projects: {
            select: { id: true, title: true, outcome: true, metric: true, isSignature: true },
          },
        },
      });

      if (!term) {
        return NextResponse.json({ error: "Semester not found" }, { status: 404 });
      }

      // Collect all top topics across subjects
      const allTopTopics: { name: string; value: number; subjectCode: string }[] = [];
      const topDecks: { title: string; slideCount: number; subjectCode: string }[] = [];

      for (const subj of term.subjects) {
        for (const c of subj.concepts) {
          allTopTopics.push({
            name: c.name,
            value: Math.round(c.value),
            subjectCode: subj.code,
          });
        }
        for (const d of subj.decks) {
          topDecks.push({
            title: d.title,
            slideCount: d.slideCount,
            subjectCode: subj.code,
          });
        }
      }

      allTopTopics.sort((a, b) => b.value - a.value);

      const wrapUp = {
        closedAt: new Date().toISOString(),
        semesterName: term.name,
        subjects: term.subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          mastery: Math.round(s.sharePrice),
        })),
        strongestTopics: allTopTopics.slice(0, 8),
        projects: term.projects.map((p) => ({
          id: p.id,
          title: p.title,
          metric: p.metric,
          isSignature: p.isSignature,
        })),
        topDecks: topDecks.slice(0, 6),
      };

      const updated = await prisma.term.update({
        where: { id },
        data: {
          isArchived: true,
          isCurrent: false,
          wrapUp,
        },
        include: {
          subjects: true,
        },
      });

      return NextResponse.json({ semester: updated, wrapUp });
    }

    // If setting as current, unmark others
    if (isCurrent) {
      await prisma.term.updateMany({
        where: { userId: user.id, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (isCurrent !== undefined) dataToUpdate.isCurrent = Boolean(isCurrent);
    if (order !== undefined) dataToUpdate.order = Number(order);

    const updated = await prisma.term.update({
      where: { id },
      data: dataToUpdate,
      include: {
        subjects: true,
      },
    });

    return NextResponse.json({ semester: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update semester" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Semester ID required" }, { status: 400 });
    }

    // Check if there are subjects attached
    const subjectCount = await prisma.subject.count({ where: { termId: id } });
    if (subjectCount > 0) {
      // Reassign to another active term if available, or unassign
      const fallbackTerm = await prisma.term.findFirst({
        where: { id: { not: id } },
        orderBy: { order: "asc" },
      });

      if (fallbackTerm) {
        await prisma.subject.updateMany({
          where: { termId: id },
          data: { termId: fallbackTerm.id },
        });
        await prisma.project.updateMany({
          where: { termId: id },
          data: { termId: fallbackTerm.id },
        });
      }
    }

    await prisma.term.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete semester" },
      { status: 500 }
    );
  }
}
