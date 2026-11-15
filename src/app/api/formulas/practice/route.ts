import { NextResponse } from "next/server";
import { FORMULA_REGISTRY, checkPracticeAnswer } from "@/lib/formulas/calculator";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, formulaKey, formulaId, params, userAnswer } = body;

    let targetKey = formulaKey;
    if (!targetKey && formulaId) {
      const f = await prisma.formula.findUnique({
        where: { id: formulaId },
        select: { calculationKey: true },
      });
      targetKey = f?.calculationKey || "wacc";
    }

    const def = FORMULA_REGISTRY[targetKey] || FORMULA_REGISTRY.wacc;

    if (action === "generate") {
      const practice = def.generatePractice();
      return NextResponse.json({
        formulaKey: def.key,
        formulaName: def.name,
        params: practice.params,
        prompt: practice.prompt,
        units: def.units || "",
      });
    }

    if (action === "check") {
      if (!params || userAnswer === undefined || isNaN(Number(userAnswer))) {
        return NextResponse.json(
          { error: "Valid numerical answer required." },
          { status: 400 }
        );
      }

      const checkResult = checkPracticeAnswer(
        def.key,
        params,
        Number(userAnswer)
      );

      return NextResponse.json({
        ...checkResult,
        formulaName: def.name,
        units: def.units || "",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Formula practice error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
