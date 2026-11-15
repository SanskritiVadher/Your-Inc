import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiCurrentUser } from "@/lib/auth";
import { isSensitivePersonalData } from "@/lib/memory";
import { MemoryType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type") as MemoryType | null;

    // Get active user
    const user = await getApiCurrentUser();

    if (!user) {
      return NextResponse.json({ memories: [] });
    }

    const whereClause: Record<string, unknown> = {
      userId: user.id,
    };

    if (subjectId && subjectId !== "all") {
      whereClause.subjectId = subjectId === "general" ? null : subjectId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (query) {
      whereClause.content = {
        contains: query,
        mode: "insensitive",
      };
    }

    const memories = await prisma.memoryEntry.findMany({
      where: whereClause,
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ memories });
  } catch (err: unknown) {
    console.error("Fetch memories error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load memory store" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, type, subjectId, source } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Memory content cannot be empty" }, { status: 400 });
    }

    // STRICT PRIVACY CHECK: Filter out sensitive personal data
    const sensitivity = isSensitivePersonalData(content);
    if (sensitivity.isSensitive) {
      return NextResponse.json(
        {
          error: `Security Policy Violation: Cannot store sensitive personal data (${sensitivity.reason})`,
          blocked: true,
        },
        { status: 400 }
      );
    }

    const user = await getApiCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User session required" }, { status: 401 });
    }

    const memory = await prisma.memoryEntry.create({
      data: {
        userId: user.id,
        subjectId: subjectId || null,
        type: type || "PERSONAL_RULE",
        content: content.trim(),
        source: source || "Manual entry",
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, memory });
  } catch (err: unknown) {
    console.error("Save memory error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to commit memory" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, content, type, subjectId } = body;

    if (!id) {
      return NextResponse.json({ error: "Memory id is required" }, { status: 400 });
    }

    if (content) {
      const sensitivity = isSensitivePersonalData(content);
      if (sensitivity.isSensitive) {
        return NextResponse.json(
          {
            error: `Security Policy Violation: Cannot store sensitive personal data (${sensitivity.reason})`,
            blocked: true,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.memoryEntry.update({
      where: { id },
      data: {
        ...(content ? { content: content.trim() } : {}),
        ...(type ? { type } : {}),
        ...(subjectId !== undefined ? { subjectId: subjectId || null } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, memory: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update memory" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get("id");

    if (body && Array.isArray(body.ids) && body.ids.length > 0) {
      // Bulk delete
      const deleteResult = await prisma.memoryEntry.deleteMany({
        where: { id: { in: body.ids } },
      });
      return NextResponse.json({ success: true, count: deleteResult.count });
    } else if (singleId) {
      // Single delete
      await prisma.memoryEntry.delete({
        where: { id: singleId },
      });
      return NextResponse.json({ success: true, deletedId: singleId });
    }

    return NextResponse.json(
      { error: "Must specify an 'id' query parameter or an array of 'ids' in the body" },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete memory" },
      { status: 500 }
    );
  }
}
