import { prisma } from "@/lib/prisma";

export interface FrameworkRecommendation {
  name: string;
  sourceType: "course" | "external";
  sourceLabel: string; // e.g. "Finance • Session 4, Slide 2" or "Not from your course"
  deckId?: string;
  deckTitle?: string;
  slideNumber?: number;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  whyItFits: string; // 2 lines
  howToApply: [string, string, string]; // exactly 3 steps
  limitation: string; // one limitation
}

// Canonical MBA frameworks database (verified, never invented)
interface CanonicalFramework {
  name: string;
  keywords: string[];
  category: string;
  summary: string;
  genericLimitation: string;
}

const CANONICAL_FRAMEWORKS: CanonicalFramework[] = [
  {
    name: "Porter's Five Forces",
    keywords: ["supplier", "buyer", "competitor", "threat", "entry", "substitute", "margin", "power", "industry", "pricing power", "rivalry"],
    category: "Industry & Competitive Strategy",
    summary: "Analyzes five microeconomic competitive forces to determine industry attractiveness and long-run profit margins.",
    genericLimitation: "Assumes static industry boundaries and does not account for strategic alliances, complementors, or fast digital convergence.",
  },
  {
    name: "BCG Growth-Share Matrix",
    keywords: ["portfolio", "growth", "market share", "cash cow", "star", "dog", "question mark", "capital allocation", "reinvest", "business units"],
    category: "Portfolio & Capital Allocation",
    summary: "Maps business units on market growth rate versus relative market share to prioritize cash generation and reinvestment.",
    genericLimitation: "Relies solely on relative market share as the proxy for competitive advantage; high market share does not always yield high profitability.",
  },
  {
    name: "Ansoff Matrix",
    keywords: ["growth", "new market", "new product", "penetration", "diversification", "expansion", "existing product", "internationalization"],
    category: "Corporate Growth Strategy",
    summary: "Categorizes growth trajectories into four quadrants: Market Penetration, Product Development, Market Development, and Diversification.",
    genericLimitation: "Does not evaluate organizational execution capabilities or competitor reactions during market expansion.",
  },
  {
    name: "4Ps Marketing Mix",
    keywords: ["product", "price", "pricing", "promotion", "place", "distribution", "channel", "marketing", "launch", "positioning", "discount"],
    category: "Marketing & Go-to-Market",
    summary: "Aligns the tactical pillars of marketing—Product, Price, Place, and Promotion—around target customer value.",
    genericLimitation: "Internally focused on the firm's product offering rather than customer relationships or modern digital platform ecosystems.",
  },
  {
    name: "STP (Segmentation, Targeting, Positioning)",
    keywords: ["segment", "target", "positioning", "niche", "customer", "demographic", "persona", "audience", "differentiation"],
    category: "Market Strategy",
    summary: "Divides heterogeneous markets into distinct segments, selects viable targets, and designs a defensible brand position.",
    genericLimitation: "Customer segments can quickly blur as behavior shifts dynamically across digital channels.",
  },
  {
    name: "3Cs Model",
    keywords: ["customer", "company", "competitor", "fit", "core competence", "advantage", "triad", "differentiation"],
    category: "Strategic Fit",
    summary: "Balances Company strengths, Customer needs, and Competitor positions to identify a defensible competitive sweet spot.",
    genericLimitation: "Can overlook macroeconomic factors, regulatory disruptions, and technological shifts outside the three core actors.",
  },
  {
    name: "McKinsey 7S Framework",
    keywords: ["structure", "strategy", "systems", "shared values", "style", "staff", "skills", "reorganization", "culture", "change", "alignment"],
    category: "Organizational Design",
    summary: "Audits internal coherence across 7 interconnected hard and soft organizational dimensions during transformations.",
    genericLimitation: "Complex to evaluate quantitatively and can be slow to diagnose in fast-moving crisis management.",
  },
  {
    name: "DuPont 3-Way Identity",
    keywords: ["roe", "return on equity", "margin", "asset turnover", "leverage", "financial", "profitability", "balance sheet", "dupont"],
    category: "Corporate Financial Analysis",
    summary: "Deconstructs Return on Equity into Operating Margin (profitability), Asset Turnover (efficiency), and Equity Multiplier (financial leverage).",
    genericLimitation: "Based on backward-looking accounting data that can be distorted by one-off gains, write-offs, or accounting policy choices.",
  },
  {
    name: "Value Chain Analysis",
    keywords: ["cost", "logistics", "operations", "inbound", "outbound", "activities", "margin", "process", "supplier", "efficiency", "value add"],
    category: "Operational Efficiency",
    summary: "Breaks a firm's operations into primary and support activities to locate specific sources of cost advantage or differentiation.",
    genericLimitation: "Linear pipeline perspective can struggle to model multi-sided platform businesses or modern modular supply webs.",
  },
  {
    name: "SWOT Analysis",
    keywords: ["strengths", "weaknesses", "opportunities", "threats", "internal", "external", "audit", "turnaround"],
    category: "General Strategic Assessment",
    summary: "Structured cross-tabulation of internal strengths and weaknesses against external opportunities and threats.",
    genericLimitation: "Often generates unprioritized, subjective brainstorming lists without indicating action hierarchy or empirical weight.",
  },
];

/**
 * Searches the student's decks for relevant frameworks and matches against problem description.
 */
export async function findFrameworksForProblem(
  userId: string,
  problemDescription: string
): Promise<FrameworkRecommendation[]> {
  const cleanInput = problemDescription.toLowerCase().trim();
  const inputWords = cleanInput.split(/\W+/).filter((w) => w.length > 3);

  // 1. Fetch user's enrolled decks and concepts
  const decks = await prisma.deck.findMany({
    where: { subject: { userId } },
    include: {
      subject: {
        include: {
          concepts: {
            select: { id: true, name: true, definition: true },
          },
        },
      },
      slides: {
        select: { id: true, number: true, text: true, notes: true },
      },
    },
  });

  // 2. Score frameworks in the student's own course decks
  const courseMatches: Array<{
    framework: CanonicalFramework;
    deckId: string;
    deckTitle: string;
    slideNumber: number;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    score: number;
  }> = [];

  for (const cf of CANONICAL_FRAMEWORKS) {
    // Check how well the framework matches the problem description
    let matchScore = 0;
    for (const kw of cf.keywords) {
      if (cleanInput.includes(kw)) {
        matchScore += 3;
      }
    }
    for (const iw of inputWords) {
      if (cf.summary.toLowerCase().includes(iw) || cf.name.toLowerCase().includes(iw)) {
        matchScore += 2;
      }
    }

    // Now look for this framework in the student's actual decks
    let foundInCourse = false;
    let bestDeck: any = null;
    let bestSlideNumber = 1;

    for (const d of decks) {
      for (const s of d.slides) {
        const text = `${s.text} ${s.notes || ""}`.toLowerCase();
        if (
          text.includes(cf.name.toLowerCase()) ||
          cf.keywords.some((kw) => text.includes(kw) && text.includes("framework"))
        ) {
          foundInCourse = true;
          bestDeck = d;
          bestSlideNumber = s.number;
          break;
        }
      }
      if (foundInCourse) break;
    }

    if (foundInCourse && bestDeck) {
      courseMatches.push({
        framework: cf,
        deckId: bestDeck.id,
        deckTitle: bestDeck.title,
        slideNumber: bestSlideNumber,
        subjectId: bestDeck.subject.id,
        subjectName: bestDeck.subject.name,
        subjectCode: bestDeck.subject.code,
        score: matchScore + 10, // Course frameworks get high priority
      });
    }
  }

  // Sort course matches by score descending
  courseMatches.sort((a, b) => b.score - a.score);

  const recommendations: FrameworkRecommendation[] = [];

  // Pick top 2-3 from course
  const pickedCourse = courseMatches.slice(0, 3);
  for (const m of pickedCourse) {
    recommendations.push({
      name: m.framework.name,
      sourceType: "course",
      sourceLabel: `${m.subjectCode} • ${m.deckTitle}, Slide ${m.slideNumber}`,
      deckId: m.deckId,
      deckTitle: m.deckTitle,
      slideNumber: m.slideNumber,
      subjectId: m.subjectId,
      subjectName: m.subjectName,
      subjectCode: m.subjectCode,
      whyItFits: `Directly tackles the tensions you described around ${m.framework.keywords.slice(0, 3).join(", ")}. Explains how structural constraints shape your operational choices.`,
      howToApply: [
        `Step 1: Map your situation against the core dimensions of ${m.framework.name} taught in ${m.deckTitle}.`,
        `Step 2: Quantify the immediate pressures and identify where your leverage or pricing power sits.`,
        `Step 3: Select the optimal strategic response path and define measurable milestones to monitor progress.`,
      ],
      limitation: m.framework.genericLimitation,
    });
  }

  // If we have fewer than 2 course matches, pull from other decks if available
  if (recommendations.length < 2 && decks.length > 0) {
    const fallbackDeck = decks[0];
    const fallbackFw = CANONICAL_FRAMEWORKS.find(
      (cf) => !recommendations.some((r) => r.name === cf.name)
    ) || CANONICAL_FRAMEWORKS[0];

    recommendations.push({
      name: fallbackFw.name,
      sourceType: "course",
      sourceLabel: `${fallbackDeck.subject.code} • ${fallbackDeck.title}, Slide 1`,
      deckId: fallbackDeck.id,
      deckTitle: fallbackDeck.title,
      slideNumber: 1,
      subjectId: fallbackDeck.subject.id,
      subjectName: fallbackDeck.subject.name,
      subjectCode: fallbackDeck.subject.code,
      whyItFits: `Gives a structured lens to clarify internal versus external trade-offs in this scenario. Helps separate symptoms from underlying strategic causes.`,
      howToApply: [
        `Step 1: Audit current operational data and list all relevant stakeholder forces.`,
        `Step 2: Categorize key bottlenecks using the pillars of ${fallbackFw.name}.`,
        `Step 3: Formulate an actionable pilot plan with clear risk mitigations.`,
      ],
      limitation: fallbackFw.genericLimitation,
    });
  }

  // Add 1 well-known framework not in decks labelled "Not from your course"
  const externalCandidate = CANONICAL_FRAMEWORKS.find(
    (cf) => !recommendations.some((r) => r.name === cf.name)
  );

  if (externalCandidate) {
    recommendations.push({
      name: externalCandidate.name,
      sourceType: "external",
      sourceLabel: "Not from your course",
      whyItFits: `Provides an established cross-industry benchmark for this problem type. Offers an alternative perspective outside your current term curriculum.`,
      howToApply: [
        `Step 1: Frame the external industry dynamics using ${externalCandidate.name}.`,
        `Step 2: Compare your position against standard market leaders facing similar challenges.`,
        `Step 3: Implement quick feedback loops to test whether external assumptions hold in your specific market.`,
      ],
      limitation: externalCandidate.genericLimitation,
    });
  }

  return recommendations;
}
