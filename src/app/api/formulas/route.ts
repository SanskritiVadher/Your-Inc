import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFormulas } from "@/lib/formulas/formulaService";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const semesterId = searchParams.get("semesterId") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const unclearOnly = searchParams.get("unclearOnly") === "true";

    const formulas = await getFormulas(user.id, {
      subjectId,
      semesterId,
      category,
      search,
      unclearOnly,
    });

    return NextResponse.json({ formulas });
  } catch (err: unknown) {
    console.error("Formulas GET error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
