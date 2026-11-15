import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ComponentInput {
  id?: string;
  name: string;
  weight: number;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const components = await prisma.evaluationComponent.findMany({
      where: { subjectId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ components });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load components" },
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
    const { components }: { components: ComponentInput[] } = body;

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: "At least one evaluation component is required" },
        { status: 400 }
      );
    }

    // Validate that weights total exactly 100%
    const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    const roundedTotal = Math.round(totalWeight * 10) / 10;

    if (Math.abs(roundedTotal - 100) > 0.1) {
      return NextResponse.json(
        {
          error: `Evaluation scheme weights must total exactly 100%. Current sum: ${roundedTotal}%`,
          currentTotal: roundedTotal,
        },
        { status: 400 }
      );
    }

    // Delete existing components and recreate in transaction to maintain exact ordering
    await prisma.$transaction(async (tx) => {
      await tx.evaluationComponent.deleteMany({
        where: { subjectId: params.id },
      });

      for (const comp of components) {
        if (!comp.name.trim()) continue;
        await tx.evaluationComponent.create({
          data: {
            subjectId: params.id,
            name: comp.name.trim(),
            weight: Number(comp.weight),
          },
        });
      }
    });

    const updated = await prisma.evaluationComponent.findMany({
      where: { subjectId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, components: updated });
  } catch (err: unknown) {
    console.error("Evaluation update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update evaluation scheme" },
      { status: 500 }
    );
  }
}
