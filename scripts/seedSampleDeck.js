const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedSampleDeck() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  let subject = await prisma.subject.findFirst({ where: { userId: user.id, code: "FIN601" } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        userId: user.id,
        name: "Corporate Finance",
        code: "FIN601",
        credits: 3,
        color: "#B3261E",
      },
    });
  }

  let concept = await prisma.concept.findFirst({
    where: { subjectId: subject.id, name: { contains: "WACC" } },
  });
  if (!concept) {
    concept = await prisma.concept.create({
      data: {
        subjectId: subject.id,
        name: "Weighted Average Cost of Capital (WACC)",
        definition: "WACC represents a firm's average after-tax cost of capital from all sources, including common stock, preferred stock, bonds, and other forms of debt.",
        value: 75.0,
        stability: 4.0,
        difficulty: 4.0,
      },
    });
  }

  let deck = await prisma.deck.findFirst({
    where: { subjectId: subject.id, sessionNumber: 4 },
  });
  if (deck) {
    console.log("Session 4 deck already exists in Corporate Finance. Skipping creation.");
    return;
  }

  const deck = await prisma.deck.create({
    data: {
      subjectId: subject.id,
      userId: user.id,
      title: "Session 4: DCF Valuation & Capital Structure Nuances",
      sessionNumber: 4,
      summary: "Explores multi-stage discounted cash flow modeling, terminal value sensitivity, and corporate leverage trade-offs under varying tax regimes.",
      status: "ready",
      progress: 100,
      sessionStatus: "Reviewed",
      slideCount: 3,
      processed: true,
      slides: {
        create: [
          {
            number: 1,
            text: "Discounted Cash Flow (DCF) Valuation Framework: Free Cash Flow to Firm (FCFF) vs Free Cash Flow to Equity (FCFE). Enterprise Value = PV of explicit forecast FCF + PV of Terminal Value.",
            notes: "Prof. Raghavan stressed: always check whether the cash flow matches the discount rate. FCFF discounted at WACC; FCFE discounted at Cost of Equity.",
            personalNotes: "Exam tip: If target capital structure differs from current, use target weights in WACC formula.",
            cards: {
              create: [
                {
                  conceptId: concept.id,
                  type: "DEFINITION",
                  front: "What is the key difference in discount rate between FCFF and FCFE?",
                  back: "FCFF represents cash flows to all capital providers and is discounted at WACC. FCFE represents residual cash to equityholders and is discounted at Ke (Cost of Equity).",
                  stability: 3.5,
                  difficulty: 4.0,
                },
              ],
            },
          },
          {
            number: 2,
            text: "Terminal Value Calculation: Gordon Growth Model vs Exit Multiple Method. TV = [FCF_{t+1}] / (WACC - g). Perpetual growth rate (g) should never exceed long-term GDP growth rate.",
            notes: "Case study discussion: Over-optimistic terminal growth rate (e.g. 6% in a 4% economy) implies the firm will outgrow the entire world economy.",
            personalNotes: "Always run a sensitivity table crossing WACC against g.",
            cards: {
              create: [
                {
                  conceptId: concept.id,
                  type: "APPLICATION",
                  front: "Why must perpetual growth rate (g) in Gordon Growth be less than long-term GDP growth?",
                  back: "If a company's cash flows grow faster than GDP indefinitely, it would mathematically consume the entire macroeconomy.",
                  stability: 4.2,
                  difficulty: 3.8,
                },
              ],
            },
          },
          {
            number: 3,
            text: "Capital Structure & WACC: Modigliani-Miller Theorem with Corporate Taxes. Debt tax shield increases firm value: V_L = V_U + (t_c * Debt). Financial distress costs offset tax advantages.",
            notes: "Trade-off theory curve: optimal debt ratio balances interest tax shields against expected bankruptcy costs.",
            personalNotes: "Remember: beyond 50-60% D/E, debt beta rises significantly due to default probability.",
            cards: {
              create: [
                {
                  conceptId: concept.id,
                  type: "FRAMEWORK",
                  front: "Explain the Trade-off Theory of Capital Structure.",
                  back: "Firms choose target leverage by trading off the corporate tax benefits of debt against the present value of financial distress and agency costs.",
                  stability: 5.0,
                  difficulty: 4.5,
                },
              ],
            },
          },
        ],
      },
    },
    include: { slides: true },
  });

  console.log("Created sample deck:", deck.id, deck.title);
}

seedSampleDeck().finally(() => prisma.$disconnect());
