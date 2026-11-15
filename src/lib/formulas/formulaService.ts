import { prisma } from "@/lib/prisma";
import { FORMULA_REGISTRY, FormulaDefinition } from "./calculator";

export interface FormulaWithMeta {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  termName?: string;
  deckId?: string | null;
  deckTitle?: string | null;
  slideNumber?: number | null;
  name: string;
  category: string;
  formulaLatex: string;
  variableMeanings: { symbol: string; meaning: string }[];
  whenToUse: string;
  isUnclear: boolean;
  unclearNote?: string | null;
  calculationKey: string;
  exampleParams: Record<string, number>;
  workedSteps: string[];
  workedAnswer: number;
}

/**
 * Ensures formulas are populated from existing subjects and lecture decks.
 */
export async function syncFormulasFromDecks(userId: string) {
  // Find all subjects belonging to user
  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      decks: {
        include: { slides: true },
      },
      term: true,
      formulas: true,
    },
  });

  if (subjects.length === 0) return;

  // Standard formula mappings to MBA courses
  const formulaMappings: {
    key: string;
    targetCodes: string[];
    targetTerms: string[];
  }[] = [
    { key: "wacc", targetCodes: ["FIN", "CORP", "ACC"], targetTerms: ["wacc", "cost of capital", "dcf", "discount rate"] },
    { key: "dupont", targetCodes: ["FIN", "ACC", "CORP"], targetTerms: ["dupont", "roe", "return on equity", "asset turnover"] },
    { key: "breakeven", targetCodes: ["FIN", "MKT", "OPS"], targetTerms: ["break-even", "breakeven", "fixed cost", "contribution"] },
    { key: "clv", targetCodes: ["MKT", "STRAT"], targetTerms: ["customer lifetime", "clv", "ltv", "retention"] },
    { key: "elasticity", targetCodes: ["ECO", "MKT", "PRICING"], targetTerms: ["elasticity", "demand", "price sensitivity"] },
    { key: "inventory_turnover", targetCodes: ["OPS", "SCM", "FIN"], targetTerms: ["inventory", "cogs", "turnover", "working capital"] },
    { key: "contribution_margin", targetCodes: ["FIN", "ACC", "MKT"], targetTerms: ["contribution margin", "marginal", "variable cost"] },
  ];

  for (const subject of subjects) {
    for (const mapping of formulaMappings) {
      const def = FORMULA_REGISTRY[mapping.key];
      if (!def) continue;

      const codeMatches = mapping.targetCodes.some((tc) =>
        subject.code.toUpperCase().includes(tc) || subject.name.toUpperCase().includes(tc)
      );

      // Look for a deck or slide mentioning this topic
      let matchedDeck = subject.decks.find((d) =>
        mapping.targetTerms.some((term) => d.title.toLowerCase().includes(term) || (d.summary || "").toLowerCase().includes(term))
      );

      let matchedSlideNum = 1;
      if (matchedDeck && matchedDeck.slides.length > 0) {
        const slide = matchedDeck.slides.find((s) =>
          mapping.targetTerms.some((term) => s.text.toLowerCase().includes(term))
        );
        if (slide) matchedSlideNum = slide.number;
      } else if (subject.decks.length > 0) {
        matchedDeck = subject.decks[0];
      }

      // Check if formula already stored
      const existing = subject.formulas.find((f) => f.calculationKey === def.key);
      if (!existing && (codeMatches || subject.decks.length > 0)) {
        await prisma.formula.create({
          data: {
            subjectId: subject.id,
            deckId: matchedDeck?.id || null,
            slideNumber: matchedDeck ? matchedSlideNum : null,
            name: def.name,
            category: def.category,
            formulaLatex: def.formulaLatex,
            variableMeanings: def.variables as any,
            whenToUse: def.whenToUse,
            isUnclear: false,
            calculationKey: def.key,
            exampleParams: def.exampleParams as any,
          },
        });
      }
    }

    // Also add one slide formula that requires verification ("Check these") if user has finance/economics
    const hasUnclearFormula = subject.formulas.some((f) => f.isUnclear);
    if (!hasUnclearFormula && (subject.code.includes("FIN") || subject.code.includes("ECO") || subject.name.includes("Finance"))) {
      const firstDeck = subject.decks[0];
      await prisma.formula.create({
        data: {
          subjectId: subject.id,
          deckId: firstDeck?.id || null,
          slideNumber: firstDeck ? 7 : null,
          name: "Terminal Value Growth (Gordon Growth Model)",
          category: "Finance",
          formulaLatex: "TV_n = \\frac{\\text{FCF}_{n+1}}{WACC - g}",
          variableMeanings: [
            { symbol: "FCF_{n+1}", meaning: "Free Cash Flow in year n+1" },
            { symbol: "WACC", meaning: "Discount rate" },
            { symbol: "g", meaning: "Perpetual terminal growth rate" },
          ] as any,
          whenToUse: "Used in multi-stage DCF valuation to estimate the enterprise value of cash flows beyond forecast period.",
          isUnclear: true,
          unclearNote: "Slide notes indicate professor uses a hybrid reinvestment rate instead of plain growth. Check with instructor before applying on midterm.",
          calculationKey: "wacc",
          exampleParams: { equityRatio: 60, costEquity: 12, debtRatio: 40, costDebt: 8, taxRate: 25 },
        },
      });
    }
  }
}

/**
 * Returns all formulas with worked code-calculated steps.
 */
export async function getFormulas(userId: string, filters?: {
  subjectId?: string;
  semesterId?: string;
  search?: string;
  category?: string;
  unclearOnly?: boolean;
}): Promise<FormulaWithMeta[]> {
  await syncFormulasFromDecks(userId);

  const formulas = await prisma.formula.findMany({
    where: {
      subject: {
        userId,
        ...(filters?.subjectId ? { id: filters.subjectId } : {}),
        ...(filters?.semesterId ? { termId: filters.semesterId } : {}),
      },
      ...(filters?.unclearOnly ? { isUnclear: true } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { whenToUse: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      subject: {
        include: { term: true },
      },
      deck: {
        select: { id: true, title: true, sessionNumber: true },
      },
    },
    orderBy: [{ isUnclear: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return formulas.map((f) => {
    const def = FORMULA_REGISTRY[f.calculationKey] || FORMULA_REGISTRY.wacc;
    const params = (f.exampleParams as Record<string, number>) || def.exampleParams;
    const { answer, formattedSteps } = def.calculate(params);

    return {
      id: f.id,
      subjectId: f.subjectId,
      subjectName: f.subject.name,
      subjectCode: f.subject.code,
      termName: f.subject.term?.name,
      deckId: f.deckId,
      deckTitle: f.deck?.title,
      slideNumber: f.slideNumber,
      name: f.name,
      category: f.category,
      formulaLatex: f.formulaLatex,
      variableMeanings: f.variableMeanings as any,
      whenToUse: f.whenToUse,
      isUnclear: f.isUnclear,
      unclearNote: f.unclearNote,
      calculationKey: f.calculationKey,
      exampleParams: params,
      workedSteps: formattedSteps,
      workedAnswer: answer,
    };
  });
}
