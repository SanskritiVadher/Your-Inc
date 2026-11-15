import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
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
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ subject });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { termId, keepFresh, name, code, credits } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (termId !== undefined) dataToUpdate.termId = termId;
    if (keepFresh !== undefined) dataToUpdate.keepFresh = Boolean(keepFresh);
    if (name !== undefined) dataToUpdate.name = name;
    if (code !== undefined) dataToUpdate.code = code;
    if (credits !== undefined) dataToUpdate.credits = Number(credits);

    const updated = await prisma.subject.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        term: true,
      },
    });

    return NextResponse.json({ subject: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update subject" },
      { status: 500 }
    );
  }
}
