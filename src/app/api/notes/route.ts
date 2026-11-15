import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const conceptId = searchParams.get("conceptId");
    const slideId = searchParams.get("slideId");

    const user = await getApiCurrentUser();
    if (!user) return NextResponse.json({ notes: [] });

    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
        ...(subjectId ? { subjectId } : {}),
        ...(conceptId ? { conceptId } : {}),
        ...(slideId ? { slideId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        concept: { select: { id: true, name: true } },
        slide: { select: { id: true, number: true, deckId: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, subjectId, conceptId, slideId, tags } = body;

    const user = await getApiCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!title?.trim() || !subjectId) {
      return NextResponse.json(
        { error: "Note title and department are required" },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        subjectId,
        conceptId: conceptId || null,
        slideId: slideId || null,
        title: title.trim(),
        content: content || "",
        tags: tags || null,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        concept: { select: { id: true, name: true } },
        slide: { select: { id: true, number: true } },
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, content, subjectId, conceptId, slideId, tags } = body;

    if (!id) return NextResponse.json({ error: "Note ID required" }, { status: 400 });

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(conceptId !== undefined ? { conceptId: conceptId || null } : {}),
        ...(slideId !== undefined ? { slideId: slideId || null } : {}),
        ...(tags !== undefined ? { tags: tags || null } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        concept: { select: { id: true, name: true } },
        slide: { select: { id: true, number: true } },
      },
    });

    return NextResponse.json({ success: true, note: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Note ID required" }, { status: 400 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete note" },
      { status: 500 }
    );
  }
}
