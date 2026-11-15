import { prisma } from "@/lib/prisma";

export interface MockQuestionContext {
  mode: "PM" | "CONSULTING" | "MARKETING" | "BEHAVIOURAL";
  roleTargeted: string;
  companyTargeted?: string;
  conceptName?: string;
  projectTitle?: string;
  previousWeakness?: string;
}

export interface ScorecardResult {
  structureScore: number; // 1 to 5
  depthScore: number;     // 1 to 5
  commScore: number;      // 1 to 5
  businessScore: number;  // 1 to 5
  overallScore: number;   // 0 to 100
  feedback: string;
  fixes: string[];        // Exactly 3 specific fixes
  targetedWeaknessLogged?: string;
}

/**
 * Generates an interview question grounded in student's concepts, projects, and past weaknesses.
 */
export async function generateInterviewQuestion(
  userId: string,
  mode: "PM" | "CONSULTING" | "MARKETING" | "BEHAVIOURAL",
  roleTargeted = "Product Manager",
  companyTargeted = "Target Company"
): Promise<{
  question: string;
  conceptId?: string;
  contextNote: string;
}> {
  // 1. Fetch recent interview weaknesses from student's memory
  const recentWeakness = await prisma.memoryEntry.findFirst({
    where: {
      userId,
      source: "MOCK_INTERVIEW",
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch a concept from student's departments
  const relevantConcept = await prisma.concept.findFirst({
    where: { subject: { userId } },
    orderBy: { value: "asc" }, // prioritize weaker concepts
    include: { subject: true },
  });

  // 3. Fetch a recent project if available
  const recentProject = await prisma.project.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const conceptName = relevantConcept?.name || "Unit Economics & Pricing Strategy";
  const projectTitle = recentProject?.title;

  let question = "";
  let contextNote = "";

  if (recentWeakness) {
    contextNote = `Targeting previously logged weakness: "${recentWeakness.content}"`;
  } else if (projectTitle) {
    contextNote = `Grounded in your logged Project: "${projectTitle}"`;
  } else {
    contextNote = `Grounded in your course concept: "${conceptName}"`;
  }

  switch (mode) {
    case "PM":
      if (recentWeakness && recentWeakness.content.toLowerCase().includes("metric")) {
        question = `In your previous mock, defining north-star metrics was flagged as an area for improvement. Imagine you are the lead PM for Blinkit's 10-minute grocery delivery. What is your primary north-star metric, and what 3 counter-metrics would you track to prevent dark-store employee burnout?`;
      } else if (projectTitle) {
        question = `You logged experience working on '${projectTitle}'. If you had to build a 0-to-1 product feature that addresses the core friction point in that domain for Tier-2 Indian cities, how would you design the user experience and prioritize the MVP scope?`;
      } else {
        question = `Design an AI-driven pricing and inventory recommendation tool for small kirana store owners. Walk me through the customer persona, the top 3 user pain points, your proposed solution, and your go-to-market rollout.`;
      }
      break;

    case "CONSULTING":
      if (recentWeakness && recentWeakness.content.toLowerCase().includes("structure")) {
        question = `Your previous drill flagged non-MECE structuring. Let's drill that: A leading premium electric two-wheeler manufacturer in India has seen profits decline by 25% over the past 3 quarters despite revenue growing 15%. Structure your root-cause hypothesis before looking at any numbers.`;
      } else {
        question = `Our client is an established Indian FMCG conglomerate considering entering the direct-to-consumer (D2C) plant-based protein market. How would you structure this market entry assessment, and what are the 3 make-or-break financial hurdles?`;
      }
      break;

    case "MARKETING":
      question = `Applying the principle of '${conceptName}', how would you reposition an established heritage dairy brand to capture health-conscious Gen Z consumers without alienating their core middle-class household customer base? Outline your positioning statement and 90-day launch campaign.`;
      break;

    case "BEHAVIOURAL":
      question = `Tell me about a high-stakes project or group case competition where team members had fundamentally conflicting opinions on the strategic direction. What was the exact conflict, what specific actions did you take to resolve it, and what was the measurable outcome (STAR format)?`;
      break;
  }

  return {
    question,
    conceptId: relevantConcept?.id,
    contextNote,
  };
}

/**
 * Generates an interviewer follow-up or pushback based on student's response.
 */
export function generateInterviewerFollowUp(
  mode: string,
  turnIndex: number,
  studentAnswer: string
): string {
  const answerLower = studentAnswer.toLowerCase();

  if (turnIndex === 1) {
    if (answerLower.includes("price") || answerLower.includes("margin") || answerLower.includes("revenue")) {
      return "You focused heavily on top-line pricing. What assumptions are you making about customer price elasticity, and how would you validate that competitor retaliation won't wipe out those gains?";
    }
    if (answerLower.includes("user") || answerLower.includes("customer") || answerLower.includes("experience")) {
      return "Good user focus. But let's push on the unit economics. How does this feature justify its engineering cost and operational complexity over the next 12 months?";
    }
    return "That provides a high-level view. How would you structure that into mutually exclusive buckets? What is the single biggest operational risk you foresee?";
  }

  if (turnIndex === 2) {
    return "Understood. If our CEO gives you only half the requested budget and requires a breakeven in 6 months instead of 18, what is the first thing you would cut, and why?";
  }

  return "Thank you. Let's wrap up this drill here so we can analyze your scorecard and key areas for executive improvement.";
}

/**
 * Evaluates the full transcript and generates the 4-pillar scorecard + 3 specific fixes.
 */
export async function evaluateMockInterview(
  interviewId: string,
  userId: string,
  transcript: Array<{ speaker: string; message: string }>
): Promise<ScorecardResult> {
  const studentMessages = transcript.filter((t) => t.speaker === "student");
  const fullStudentText = studentMessages.map((m) => m.message).join(" ");
  const wordCount = fullStudentText.split(/\s+/).length;

  // Rule-based heuristic evaluation reflecting MBA rubric rigor
  let structure = 3.5;
  let depth = 3.5;
  let comm = 3.5;
  let business = 3.5;

  const textLower = fullStudentText.toLowerCase();

  // Structure checks (MECE, framing, sequencing)
  if (textLower.includes("first") || textLower.includes("second") || textLower.includes("bucket") || textLower.includes("pillar") || textLower.includes("framework")) {
    structure += 0.8;
  }
  if (wordCount > 150) structure += 0.3;

  // Depth checks (economic reasoning, trade-offs, metrics)
  if (textLower.includes("margin") || textLower.includes("trade-off") || textLower.includes("retention") || textLower.includes("elasticity") || textLower.includes("cac") || textLower.includes("ltv")) {
    depth += 0.8;
  }

  // Communication checks (conciseness vs rambling)
  if (wordCount >= 80 && wordCount <= 350) {
    comm += 0.7; // concise
  } else if (wordCount > 500) {
    comm -= 0.5; // too verbose
  }

  // Business sense (realism, feasibility)
  if (textLower.includes("risk") || textLower.includes("validate") || textLower.includes("pilot") || textLower.includes("test") || textLower.includes("competitor")) {
    business += 0.8;
  }

  // Cap scores between 1.0 and 5.0
  const structureScore = Number(Math.min(5.0, Math.max(1.0, structure)).toFixed(1));
  const depthScore = Number(Math.min(5.0, Math.max(1.0, depth)).toFixed(1));
  const commScore = Number(Math.min(5.0, Math.max(1.0, comm)).toFixed(1));
  const businessScore = Number(Math.min(5.0, Math.max(1.0, business)).toFixed(1));

  const overallScore = Number((((structureScore + depthScore + commScore + businessScore) / 20) * 100).toFixed(1));

  // Determine 3 specific, actionable fixes
  const fixes: string[] = [];

  if (structureScore < 4.0) {
    fixes.push("Frame upfront: State your top 3 categories before diving into details (e.g., Supply, Demand, Unit Economics).");
  } else {
    fixes.push("Refine synthesis: Close your recommendation with a crisp 1-sentence bottom-line takeaway.");
  }

  if (depthScore < 4.0) {
    fixes.push("Quantify trade-offs: Ground strategic claims in unit economics (CAC, LTV, payback period) rather than qualitative descriptions.");
  } else {
    fixes.push("Stress-test assumptions: Explicitly state the sensitivity of your model to unexpected macro changes.");
  }

  if (businessScore < 4.0) {
    fixes.push("Address second-order risks: Account for competitor counter-moves and regulatory constraints before concluding.");
  } else {
    fixes.push("Propose a rollout pilot: Detail a low-risk phased experiment to validate assumptions with real customers.");
  }

  const feedback =
    overallScore >= 80
      ? "Strong executive presence and structured economic reasoning. Good handling of pushback with grounded trade-offs."
      : "Solid conceptual foundation, but structure and numerical grounding need tightening under pressure.";

  // Log weakest area to MemoryEntry for subsequent mocks
  let targetedWeaknessLogged = "";
  if (structureScore <= 3.5) {
    targetedWeaknessLogged = "MECE structuring and upfront categorization under pushback";
  } else if (depthScore <= 3.5) {
    targetedWeaknessLogged = "Unit economic trade-offs and quantitative rigor";
  } else {
    targetedWeaknessLogged = "Second-order risk analysis and competitor retaliation response";
  }

  await prisma.memoryEntry.create({
    data: {
      userId,
      type: "PAST_MISTAKE",
      content: `Mock interview priority weakness: ${targetedWeaknessLogged} (Score: ${overallScore}/100)`,
      source: "MOCK_INTERVIEW",
    },
  });

  // Update MockInterview record in database
  await prisma.mockInterview.update({
    where: { id: interviewId },
    data: {
      structureScore,
      depthScore,
      commScore,
      businessScore,
      performanceScore: overallScore,
      feedback,
      fixes: fixes as unknown as object,
      completed: true,
      transcript: transcript as unknown as object,
    },
  });

  return {
    structureScore,
    depthScore,
    commScore,
    businessScore,
    overallScore,
    feedback,
    fixes,
    targetedWeaknessLogged,
  };
}
