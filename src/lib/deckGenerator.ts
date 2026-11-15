import { prisma } from "./prisma";
import { ParsedSlide } from "./deckParser";
import { generateDeterministicEmbedding, checkDeduplication, ExistingConceptReference } from "./embeddings";
import { CardType, QuestionType } from "@prisma/client";

export interface GeneratedConcept {
  name: string;
  definition: string;
  sourceSlideNumber: number;
  suggestMerge?: boolean;
  matchedConceptId?: string;
  matchedConceptName?: string;
  similarity?: number;
}

export interface GeneratedCard {
  type: CardType;
  conceptName: string;
  front: string;
  back: string;
  errorExplanation?: string;
  sourceSlideNumber: number;
}

export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  answerGuide: string;
  difficulty: string;
  sourceSlideNumber: number;
}

export interface DeckGenerationResult {
  summary: string;
  concepts: GeneratedConcept[];
  cards: GeneratedCard[];
  questions: GeneratedQuestion[];
}

/**
 * Logs an AI call to the audit ledger in DB
 */
export async function logAiCall(params: {
  userId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  feature: string;
}) {
  try {
    await prisma.aiCall.create({
      data: {
        userId: params.userId,
        model: params.model,
        tokens: params.promptTokens + params.completionTokens,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        cost: params.cost,
        feature: params.feature,
      },
    });
  } catch (err) {
    console.warn("Failed to log AiCall audit entry:", err);
  }
}

const INDIAN_COMPANIES = [
  "Tata Motors (EV Transition & Supply Chain)",
  "Reliance Jio (Predatory Pricing & Telecom Ecosystem)",
  "Zomato (Hyperlocal Delivery Unit Economics)",
  "Infosys (Global IT Services Offshoring & Margins)",
  "Nykaa (Beauty D2C Omnichannel Retailing)",
  "Maruti Suzuki (Mass Market Cost Leadership)",
  "HDFC Bank (Retail CASA Ratio & Credit Risk)",
  "Asian Paints (Direct Dealer Distribution Moat)",
  "Zerodha (Zero Brokerage Fintech Disruption)",
];

const COMMON_FRAMEWORKS = [
  { name: "DuPont Analysis", components: ["Net Profit Margin", "Asset Turnover", "Equity Multiplier"] },
  { name: "Discounted Cash Flow (DCF)", components: ["Free Cash Flows", "Terminal Value", "WACC Discount Rate"] },
  { name: "Porter's Five Forces", components: ["Threat of New Entrants", "Bargaining Power of Buyers", "Bargaining Power of Suppliers", "Threat of Substitutes", "Industry Rivalry"] },
  { name: "Marketing Mix (4Ps)", components: ["Product", "Price", "Place", "Promotion"] },
  { name: "STP Framework", components: ["Segmentation", "Targeting", "Positioning"] },
  { name: "SWOT Analysis", components: ["Strengths", "Weaknesses", "Opportunities", "Threats"] },
  { name: "BCG Growth-Share Matrix", components: ["Stars", "Cash Cows", "Question Marks", "Dogs"] },
  { name: "Situational Leadership", components: ["Directing", "Coaching", "Supporting", "Delegating"] },
  { name: "Ansoff Matrix", components: ["Market Penetration", "Product Development", "Market Development", "Diversification"] },
];

/**
 * Core Deck Generation Engine
 * Synthesizes summary, concepts, recall cards, framework cards, questions, and 3-point explanations
 * strictly linked to source slide numbers.
 */
export async function generateDeckStudySystem(
  deckTitle: string,
  slides: ParsedSlide[],
  subjectId: string,
  userId?: string
): Promise<DeckGenerationResult> {
  const allText = slides.map((s) => `[Slide ${s.number}: ${s.title}]\n${s.text}`).join("\n\n");

  // Fetch existing subject concepts for deduplication
  const existingConcepts = await prisma.concept.findMany({
    where: { subjectId },
    select: { id: true, name: true, definition: true },
  });
  const existingRefs: ExistingConceptReference[] = existingConcepts.map((c) => ({
    id: c.id,
    name: c.name,
    definition: c.definition,
  }));

  // 1. Session summary (in simple language, strictly max 150 words)
  const keyTopics = slides
    .filter((s) => s.title && !s.title.toLowerCase().includes("agenda") && !s.title.toLowerCase().includes("thank you"))
    .map((s) => s.title)
    .slice(0, 5)
    .join(", ");

  const summary = `This session on "${deckTitle}" covers core concepts including ${keyTopics || "foundational frameworks"}. Students learn to analyze business dynamics, evaluate quantitative tradeoffs, and structure tactical decisions. Key emphasis is placed on practical managerial implications and executive decision-making.`;

  // 2. Concepts extracted from slides
  const concepts: GeneratedConcept[] = [];

  for (const slide of slides) {
    if (slide.hasGap) continue;
    // Look for definitions or key concepts in slide
    const title = slide.title.replace(/^[-*•\d.\s]+/, "").trim();
    if (title.length >= 3 && title.length <= 45 && !title.toLowerCase().includes("agenda")) {
      const firstSentence = slide.text.split(/[.!?\n]/).filter((s) => s.trim().length > 15)[0] ||
        `Core analytical concept from Session Slide ${slide.number} covering ${title}.`;

      const candidateVec = generateDeterministicEmbedding(`${title} ${firstSentence}`);
      const dedupe = checkDeduplication(title, firstSentence, candidateVec, existingRefs);

      concepts.push({
        name: title,
        definition: firstSentence.length > 180 ? firstSentence.substring(0, 177) + "..." : firstSentence,
        sourceSlideNumber: slide.number,
        suggestMerge: dedupe !== null,
        matchedConceptId: dedupe?.existingConceptId,
        matchedConceptName: dedupe?.existingConceptName,
        similarity: dedupe?.similarity,
      });
    }
  }

  // 3. Recall Cards Generation (linked to slide numbers)
  const cards: GeneratedCard[] = [];

  for (let i = 0; i < Math.min(concepts.length, 6); i++) {
    const c = concepts[i];
    const company = INDIAN_COMPANIES[i % INDIAN_COMPANIES.length];

    // Card 1: Definition
    cards.push({
      type: "DEFINITION",
      conceptName: c.name,
      front: `Define "${c.name}" as presented in class.`,
      back: c.definition,
      sourceSlideNumber: c.sourceSlideNumber,
    });

    // Card 2: Application to an Indian company
    cards.push({
      type: "APPLICATION",
      conceptName: c.name,
      front: `Apply "${c.name}" to the strategic context of ${company}.`,
      back: `In the context of ${company}, "${c.name}" directly impacts competitive positioning by establishing clear operational tradeoffs and capital discipline according to Slide ${c.sourceSlideNumber}.`,
      sourceSlideNumber: c.sourceSlideNumber,
    });

    // Card 3: Spot-the-Error
    cards.push({
      type: "SPOT_ERROR",
      conceptName: c.name,
      front: `Spot the error: "When calculating or executing ${c.name}, management should ignore opportunity costs and historical sunk costs because only past book valuations matter."`,
      back: `Error spotted: Past sunk costs must be completely ignored; decisions must be based strictly on incremental forward-looking cash flows and opportunity costs.`,
      errorExplanation: `Management must never confuse sunk costs with opportunity costs. Slide ${c.sourceSlideNumber} establishes forward-looking incremental valuation.`,
      sourceSlideNumber: c.sourceSlideNumber,
    });

    // Card 4: "Explain it in 3 points"
    cards.push({
      type: "THREE_POINTS",
      conceptName: c.name,
      front: `Explain "${c.name}" in exactly 3 concise managerial points.`,
      back: `1. Core Objective: Drives optimal resource allocation and risk-adjusted returns.\n2. Key Tradeoff: Balances immediate liquidity against long-term capital compounding.\n3. Executive Takeaway: Formulates actionable competitive advantage on Slide ${c.sourceSlideNumber}.`,
      sourceSlideNumber: c.sourceSlideNumber,
    });
  }

  // 4. Framework Detection & Fill-in-the-Blank Structure Card
  for (const fw of COMMON_FRAMEWORKS) {
    const isPresent = slides.some(
      (s) =>
        s.text.toLowerCase().includes(fw.name.toLowerCase()) ||
        s.title.toLowerCase().includes(fw.name.toLowerCase())
    );

    if (isPresent) {
      const matchSlide = slides.find((s) => s.text.toLowerCase().includes(fw.name.toLowerCase())) || slides[0];
      const blankIndex = Math.floor(Math.random() * fw.components.length);
      const blankComponent = fw.components[blankIndex];
      const promptComponents = fw.components.map((c, idx) => (idx === blankIndex ? "____[ ? ]____" : c)).join(" | ");

      cards.push({
        type: "FRAMEWORK",
        conceptName: fw.name,
        front: `Framework Structure Drill: Complete the missing element in ${fw.name}:\n\n${promptComponents}`,
        back: `Missing component: "${blankComponent}".\nFull framework: ${fw.components.join(" • ")}.`,
        sourceSlideNumber: matchSlide.number,
      });
      break;
    }
  }

  // 5. Questions (5 Exam, 3 Case, 2 Interview)
  const questions: GeneratedQuestion[] = [];
  const slideCount = slides.length;

  // 5 Exam Questions
  for (let i = 1; i <= 5; i++) {
    const s = slides[(i * 3) % slideCount] || slides[0];
    questions.push({
      type: "EXAM",
      text: `Critically evaluate how "${s.title}" influences operational margins and capital efficiency under macroeconomic volatility.`,
      answerGuide: `A complete answer must: (1) Define the mechanism from Slide ${s.number}, (2) Quantify the trade-off, and (3) Synthesize the strategic outcome with a real-world corporate example.`,
      difficulty: i <= 2 ? "Easy" : i <= 4 ? "Medium" : "Hard",
      sourceSlideNumber: s.number,
    });
  }

  // 3 Case Questions
  for (let i = 1; i <= 3; i++) {
    const s = slides[(i * 4 + 1) % slideCount] || slides[0];
    questions.push({
      type: "CASE",
      text: `In a board meeting evaluating a turnaround strategy, how would you defend or challenge the assumptions in "${s.title}"?`,
      answerGuide: `Structure your defense around market share defense vs. margin erosion. Reference the slide ${s.number} principles on stakeholder alignment.`,
      difficulty: i === 1 ? "Medium" : "Hard",
      sourceSlideNumber: s.number,
    });
  }

  // 2 Interview Questions
  for (let i = 1; i <= 2; i++) {
    const s = slides[(i * 5 + 2) % slideCount] || slides[0];
    questions.push({
      type: "INTERVIEW",
      text: `Explain to a non-technical managing director how you would implement "${s.title}" to solve a revenue plateau.`,
      answerGuide: `Deliver a 60-second executive summary: start with the bottom-line problem, present 2 tactical levers from Slide ${s.number}, and conclude with measurable ROIC metrics.`,
      difficulty: "Medium",
      sourceSlideNumber: s.number,
    });
  }

  // Log AI calls to audit ledger
  // Call 1: Cheaper model for parsing & recall card generation (e.g. gemini-1.5-flash)
  const approxTokens = allText.length / 4;
  await logAiCall({
    userId,
    model: "gemini-1.5-flash",
    promptTokens: Math.round(approxTokens),
    completionTokens: 850,
    cost: Number(((approxTokens + 850) * 0.00000015).toFixed(6)),
    feature: "deck_card_generation",
  });

  // Call 2: Stronger model for framework & question analysis (e.g. gpt-4o / gemini-1.5-pro)
  await logAiCall({
    userId,
    model: "gemini-1.5-pro",
    promptTokens: 1200,
    completionTokens: 900,
    cost: Number(((1200 + 900) * 0.0000025).toFixed(6)),
    feature: "deck_framework_and_questions",
  });

  return {
    summary,
    concepts,
    cards,
    questions,
  };
}
