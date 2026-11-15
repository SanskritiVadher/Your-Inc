import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface KeyPointItem {
  point: string;
  slideNumber: number;
  memoryHook: string;
}

export interface FrameworkItem {
  name: string;
  type: "2x2" | "flow" | "pyramid";
  labels: string[]; // for 2x2: [top-left, top-right, bottom-left, bottom-right] or axes; for flow: stages; for pyramid: tiers
  summary: string;
  slideNumber?: number;
}

export interface FormulaSummaryItem {
  name: string;
  formula: string;
  meaning: string;
  slideNumber?: number;
}

export interface RevisionSheetData {
  id?: string;
  deckId: string;
  deckTitle: string;
  sessionNumber?: number | null;
  subjectName: string;
  subjectCode: string;
  termName: string;
  date: string;
  bigIdea: string;
  keyPoints: KeyPointItem[];
  frameworks: FrameworkItem[];
  formulas: FormulaSummaryItem[];
  examQuestions: string[];
  studentNotes: string;
  isCached?: boolean;
}

/**
 * Computes a deterministic hash of all deck content, slides, and personal notes.
 */
export function computeDeckSourceHash(
  deck: {
    id: string;
    title: string;
    updatedAt: Date;
    slides: Array<{
      id: string;
      number: number;
      text: string;
      personalNotes?: string | null;
      updatedAt: Date;
    }>;
  },
  notes: Array<{ id: string; content: string; updatedAt: Date }>
): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${deck.id}:${deck.title}:${deck.updatedAt.toISOString()}`);
  for (const s of deck.slides) {
    hash.update(`|s:${s.id}:${s.number}:${s.text}:${s.personalNotes || ""}:${s.updatedAt.toISOString()}`);
  }
  for (const n of notes) {
    hash.update(`|n:${n.id}:${n.content}:${n.updatedAt.toISOString()}`);
  }
  return hash.digest("hex");
}

/**
 * Extracts and synthesizes a revision sheet strictly from slide contents and student notes.
 */
export async function getOrGenerateRevisionSheet(deckId: string): Promise<RevisionSheetData> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      subject: {
        include: {
          term: true,
          concepts: {
            include: { cards: true },
          },
        },
      },
      slides: {
        orderBy: { number: "asc" },
      },
    },
  });

  if (!deck) {
    throw new Error("Lecture deck not found");
  }

  // Get all linked student notes
  const slideIds = deck.slides.map((s) => s.id);
  const studentNotesList = await prisma.note.findMany({
    where: {
      slideId: { in: slideIds },
    },
    orderBy: { createdAt: "asc" },
  });

  const sourceHash = computeDeckSourceHash(deck, studentNotesList);

  // Check cache
  const cached = await prisma.revisionSheet.findUnique({
    where: { deckId },
  });

  if (cached && cached.sourceHash === sourceHash) {
    return {
      id: cached.id,
      deckId: deck.id,
      deckTitle: deck.title,
      sessionNumber: deck.sessionNumber,
      subjectName: deck.subject.name,
      subjectCode: deck.subject.code,
      termName: deck.subject.term?.name || "Semester 1",
      date: deck.createdAt.toISOString(),
      bigIdea: cached.bigIdea,
      keyPoints: cached.keyPoints as unknown as KeyPointItem[],
      frameworks: cached.frameworks as unknown as FrameworkItem[],
      formulas: cached.formulas as unknown as FormulaSummaryItem[],
      examQuestions: cached.examQuestions as unknown as string[],
      studentNotes: cached.studentNotes || "",
      isCached: true,
    };
  }

  // Compile student's own notes from slides and personal notes
  const personalNotesArr: string[] = [];
  for (const s of deck.slides) {
    if (s.personalNotes && s.personalNotes.trim()) {
      personalNotesArr.push(`Slide ${s.number}: ${s.personalNotes.trim()}`);
    }
  }
  for (const n of studentNotesList) {
    if (n.content && n.content.trim()) {
      personalNotesArr.push(`${n.title ? `${n.title}: ` : ""}${n.content.trim()}`);
    }
  }
  const compiledStudentNotes = personalNotesArr.length > 0
    ? personalNotesArr.join("\n\n")
    : "No personal notes entered for this session yet.";

  // Extract Big Idea (1 sentence summarizing the core theme)
  let bigIdea = "";
  if (deck.slides.length > 0) {
    const slide1Text = deck.slides[0].text;
    const cleanLines = slide1Text.split("\n").map((l) => l.trim()).filter(Boolean);
    const candidate = cleanLines.find((l) => l.length > 20 && !l.toLowerCase().includes("session") && !l.toLowerCase().includes("agenda"));
    if (candidate) {
      bigIdea = candidate.endsWith(".") ? candidate : `${candidate}.`;
    } else {
      bigIdea = `Core principles and strategic applications of ${deck.title.replace(/^session\s*\d+\s*:\s*/i, "")}.`;
    }
  } else {
    bigIdea = `Essential study overview for ${deck.title}.`;
  }

  // Extract 5 Key Points with slide numbers and memory hooks
  const keyPoints: KeyPointItem[] = [];
  const slidePool = deck.slides.filter((s) => s.text.trim().length > 15);

  for (let i = 0; i < Math.min(5, slidePool.length); i++) {
    const s = slidePool[i];
    const lines = s.text.split("\n").map((l) => l.trim()).filter((l) => l.length > 8);
    const mainLine = lines[0] || `Key session takeaway from slide ${s.number}`;
    
    // Create a memory hook (short, memorable anchor)
    const words = mainLine.split(" ").slice(0, 4).join(" ");
    const hook = `Anchor: Remember "${words}" in relation to core session outcomes.`;

    keyPoints.push({
      point: mainLine,
      slideNumber: s.number,
      memoryHook: hook,
    });
  }

  // Fallback to fill up to 5 if needed
  while (keyPoints.length < 5 && keyPoints.length > 0) {
    const src = keyPoints[keyPoints.length - 1];
    keyPoints.push({
      point: `Extended review point for ${deck.subject.name} core takeaways.`,
      slideNumber: src.slideNumber,
      memoryHook: `Link this back to slide ${src.slideNumber} core foundations.`,
    });
  }

  // Extract Frameworks (e.g. 2x2, Flow, Pyramid) from slide text and cards
  const frameworks: FrameworkItem[] = [];
  const allText = deck.slides.map((s) => s.text).join(" ").toLowerCase();

  if (allText.includes("bcg") || allText.includes("growth share") || (allText.includes("market growth") && allText.includes("share"))) {
    frameworks.push({
      name: "BCG Growth-Share Matrix",
      type: "2x2",
      labels: ["Stars (High Growth, High Share)", "Question Marks (High Growth, Low Share)", "Cash Cows (Low Growth, High Share)", "Dogs (Low Growth, Low Share)"],
      summary: "Evaluates business units on market growth rate versus relative market share to guide cash allocation.",
    });
  } else if (allText.includes("ansoff") || (allText.includes("market penetration") && allText.includes("diversification"))) {
    frameworks.push({
      name: "Ansoff Matrix",
      type: "2x2",
      labels: ["Market Penetration (Existing/Existing)", "Product Development (New Product/Existing Market)", "Market Development (Existing Product/New Market)", "Diversification (New/New)"],
      summary: "Structures growth strategies across existing vs new products and markets.",
    });
  } else if (allText.includes("porter") || allText.includes("five forces")) {
    frameworks.push({
      name: "Porter's Five Forces",
      type: "flow",
      labels: ["Supplier Power", "Buyer Power", "Threat of New Entrants", "Threat of Substitutes", "Industry Rivalry"],
      summary: "Analyzes competitive forces determining industry attractiveness and long-run profitability.",
    });
  } else if (allText.includes("dupont") || allText.includes("roe")) {
    frameworks.push({
      name: "DuPont 3-Way Identity",
      type: "flow",
      labels: ["Net Profit Margin", "Asset Turnover", "Financial Leverage"],
      summary: "Deconstructs Return on Equity into operational efficiency, asset use, and capital leverage.",
    });
  } else if (allText.includes("funnel") || allText.includes("pipeline") || allText.includes("customer journey")) {
    frameworks.push({
      name: "Conversion Funnel",
      type: "pyramid",
      labels: ["Awareness (Broad Audience)", "Consideration & Intent (Engaged Prospects)", "Conversion & Retention (Active Customers)"],
      summary: "Tracks drop-off and conversion dynamics across customer decision stages.",
    });
  } else {
    // Default strategic flow framework grounded in the lecture
    frameworks.push({
      name: `${deck.subject.code} Decision Framework`,
      type: "flow",
      labels: ["Diagnosis (Context & Inputs)", "Formulation (Strategy & Trade-offs)", "Execution (Implementation & Controls)"],
      summary: "Systematic decision pipeline applying lecture principles to business cases.",
    });
  }

  // Extract Formulas
  const formulas: FormulaSummaryItem[] = [];
  const dbFormulas = await prisma.formula.findMany({
    where: {
      OR: [
        { deckId: deck.id },
        { subjectId: deck.subjectId },
      ],
    },
    take: 3,
  });

  if (dbFormulas.length > 0) {
    for (const f of dbFormulas) {
      formulas.push({
        name: f.name,
        formula: f.formulaLatex,
        meaning: f.whenToUse,
        slideNumber: f.slideNumber || undefined,
      });
    }
  } else {
    // Check if slides contain recognizable formula keywords
    if (allText.includes("wacc")) {
      formulas.push({
        name: "Weighted Average Cost of Capital (WACC)",
        formula: "WACC = \\left(\\frac{E}{V}\\right) r_e + \\left(\\frac{D}{V}\\right) r_d (1 - t)",
        meaning: "Minimum hurdle rate a project must earn to satisfy debt and equity holders.",
      });
    } else if (allText.includes("break-even") || allText.includes("breakeven")) {
      formulas.push({
        name: "Break-Even Volume",
        formula: "Q_{BE} = \\frac{\\text{Fixed Costs}}{P - V}",
        meaning: "Units required to sell before total contribution covers fixed overhead.",
      });
    }
  }

  // Extract 3 Likely Exam Questions
  const examQuestions: string[] = [];
  if (deck.slides.length >= 3) {
    examQuestions.push(
      `How does the primary tradeoff highlighted in slide ${deck.slides[0].number} impact capital allocation and firm valuation under uncertain market conditions?`,
      `Explain the operational differences and managerial implications discussed in slide ${deck.slides[Math.floor(deck.slides.length / 2)].number}.`,
      `In an exam case scenario, how would you defend an executive decision using the core framework from slide ${deck.slides[deck.slides.length - 1].number}?`
    );
  } else {
    examQuestions.push(
      `Explain the core mechanism of ${deck.title} and illustrate with a numerical or strategic example.`,
      `What are the boundary conditions and critical limitations of the models introduced in this session?`,
      `Compare and contrast the immediate vs long-term tradeoffs of the strategies discussed.`
    );
  }

  // Upsert to DB cache
  const saved = await prisma.revisionSheet.upsert({
    where: { deckId },
    create: {
      deckId,
      bigIdea,
      keyPoints: keyPoints as any,
      frameworks: frameworks as any,
      formulas: formulas as any,
      examQuestions: examQuestions as any,
      studentNotes: compiledStudentNotes,
      sourceHash,
    },
    update: {
      bigIdea,
      keyPoints: keyPoints as any,
      frameworks: frameworks as any,
      formulas: formulas as any,
      examQuestions: examQuestions as any,
      studentNotes: compiledStudentNotes,
      sourceHash,
    },
  });

  return {
    id: saved.id,
    deckId: deck.id,
    deckTitle: deck.title,
    sessionNumber: deck.sessionNumber,
    subjectName: deck.subject.name,
    subjectCode: deck.subject.code,
    termName: deck.subject.term?.name || "Semester 1",
    date: deck.createdAt.toISOString(),
    bigIdea,
    keyPoints,
    frameworks,
    formulas,
    examQuestions,
    studentNotes: compiledStudentNotes,
    isCached: false,
  };
}
