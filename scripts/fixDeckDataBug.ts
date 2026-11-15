import { prisma } from "../src/lib/prisma";

async function fixDataBug() {
  console.log("Fixing deck duplication and subject assignments...");

  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  const finSubject = await prisma.subject.findFirst({
    where: { userId: user.id, code: "FIN601" },
  });
  const mktSubject = await prisma.subject.findFirst({
    where: { userId: user.id, code: "MKT502" },
  });

  if (!finSubject || !mktSubject) {
    throw new Error("Could not find FIN601 or MKT502");
  }

  // 1. Delete duplicate DCF deck cmwhfp9j4000112xoev4k54xo if it exists
  const dupDeck = await prisma.deck.findUnique({
    where: { id: "cmwhfp9j4000112xoev4k54xo" },
  });
  if (dupDeck) {
    console.log("Deleting duplicate deck cmwhfp9j4000112xoev4k54xo...");
    await prisma.deck.delete({ where: { id: "cmwhfp9j4000112xoev4k54xo" } });
  }

  // 2. Ensure WACC & DCF concept exists under Corporate Finance
  let waccConcept = await prisma.concept.findFirst({
    where: { subjectId: finSubject.id, name: { contains: "WACC" } },
  });
  if (!waccConcept) {
    waccConcept = await prisma.concept.create({
      data: {
        subjectId: finSubject.id,
        name: "Weighted Average Cost of Capital (WACC) & DCF",
        definition: "WACC represents a firm's average after-tax cost of capital across equity and debt, used as the discount rate for FCFF in multi-stage DCF valuation models.",
        value: 78.0,
        stability: 4.5,
        difficulty: 4.0,
      },
    });
  }

  // Re-link DCF cards to waccConcept
  const dcfCards = await prisma.card.findMany({
    where: {
      OR: [
        { front: { contains: "FCFF" } },
        { front: { contains: "Gordon Growth" } },
        { front: { contains: "Trade-off Theory" } },
      ],
    },
  });
  for (const c of dcfCards) {
    await prisma.card.update({
      where: { id: c.id },
      data: { conceptId: waccConcept.id },
    });
  }

  // 3. Move Customer Lifetime Value concept to Marketing Strategy (MKT502)
  const clvConcept = await prisma.concept.findFirst({
    where: { name: { contains: "Customer Lifetime Value" } },
  });
  if (clvConcept) {
    await prisma.concept.update({
      where: { id: clvConcept.id },
      data: { subjectId: mktSubject.id },
    });
    console.log(`Moved CLV concept (${clvConcept.id}) to Marketing Strategy (${mktSubject.id})`);
  }

  // 4. Create or assign the Customer Lifetime Value deck under Marketing Strategy
  let clvDeck = await prisma.deck.findFirst({
    where: { subjectId: mktSubject.id, title: { contains: "Customer Lifetime Value" } },
    include: { slides: true },
  });
  if (!clvDeck && clvConcept) {
    clvDeck = await prisma.deck.create({
      data: {
        subjectId: mktSubject.id,
        userId: user.id,
        title: "Session 3: Customer Lifetime Value & Retention Metrics",
        sessionNumber: 3,
        summary: "Analyzes customer acquisition cost (CAC), churn rates, retention curves, and net lifetime value modeling for unit economics.",
        status: "ready",
        progress: 100,
        sessionStatus: "Reviewed",
        slideCount: 3,
        processed: true,
        slides: {
          create: [
            {
              number: 1,
              text: "Customer Lifetime Value (CLV) Foundations: Gross Margin × (Retention Rate / (1 + Discount Rate - Retention Rate)) - CAC. Unit economics must maintain CLV/CAC > 3x.",
              notes: "Key managerial insight: Acquisition without retention burns venture capital. Retention improvements drive compound margins.",
              personalNotes: "Remember: If churn is annual, align retention period with annual gross margin.",
            },
            {
              number: 2,
              text: "Cohort Churn Analysis & Retention Curves: Voluntary vs Involuntary Churn. Flattening retention curves indicate true product-market fit.",
              notes: "Case takeaway: High early churn signals onboarding friction; late churn indicates value exhaustion.",
              personalNotes: "Focus on net revenue retention (NRR) > 100% via expansion revenue.",
            },
            {
              number: 3,
              text: "Strategic Tradeoffs in Indian Commerce: Balancing price sensitivity against unit margin and repeat purchase frequency in Tier 2/3 markets.",
              notes: "Price discounts drive GMV but depress customer lifetime value if cohort retention drops below 20%.",
              personalNotes: "Exam formulation: Explain the tension between fast market share acquisition and sustainable unit margins.",
            },
          ],
        },
      },
      include: { slides: true },
    });
    console.log("Created Customer Lifetime Value deck under Marketing Strategy:", clvDeck.id);

    // Link the 4 CLV cards to the slides of this CLV deck
    const clvCards = await prisma.card.findMany({
      where: { conceptId: clvConcept.id },
      orderBy: { createdAt: "asc" },
    });
    for (let i = 0; i < clvCards.length; i++) {
      const slide = clvDeck.slides[Math.min(i, clvDeck.slides.length - 1)];
      await prisma.card.update({
        where: { id: clvCards[i].id },
        data: { sourceSlideId: slide.id },
      });
    }
  }

  console.log("Data bug fix completed successfully!");
}

fixDataBug()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
