import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { role = "Product Manager", company = "Target Company", jobDescription = "" } = body;

    const roleLower = (role + " " + jobDescription).toLowerCase();

    // 1. Gather ALL topics from ALL semesters
    const allConcepts = await prisma.concept.findMany({
      where: {
        subject: { userId: user.id },
      },
      include: {
        subject: {
          include: { term: true },
        },
        _count: { select: { cards: true } },
      },
      orderBy: { value: "desc" },
    });

    // Score relevance of concepts
    const scoredConcepts = allConcepts.map((c) => {
      let score = 0;
      const text = (c.name + " " + c.definition + " " + c.subject.name).toLowerCase();

      // Check keywords from role & JD
      const keywords = roleLower.split(/\W+/).filter((w) => w.length > 3);
      for (const kw of keywords) {
        if (text.includes(kw)) score += 3;
      }

      // Bonus for lower mastery topics (need revision)
      if (c.value < 75) score += 2;

      // Base score from card count
      score += Math.min(3, c._count.cards);

      return { concept: c, score };
    });

    scoredConcepts.sort((a, b) => b.score - a.score);

    // Pick top 10 topics to revise
    const top10Topics = scoredConcepts.slice(0, 10).map((item) => ({
      id: item.concept.id,
      name: item.concept.name,
      definition: item.concept.definition,
      mastery: Math.round(item.concept.value),
      subjectCode: item.concept.subject.code,
      subjectName: item.concept.subject.name,
      semesterName: item.concept.subject.term?.name || "Semester 1",
    }));

    // 2. Gather ALL projects from Project Vault across all semesters
    const allProjects = await prisma.project.findMany({
      where: { userId: user.id },
      include: { term: true, subject: true },
      orderBy: [{ isSignature: "desc" }, { createdAt: "desc" }],
    });

    // Score projects
    const scoredProjects = allProjects.map((p) => {
      let score = p.isSignature ? 10 : 0;
      const text = (p.title + " " + p.description + " " + (p.tools || "") + " " + (p.outcome || "")).toLowerCase();
      const keywords = roleLower.split(/\W+/).filter((w) => w.length > 3);
      for (const kw of keywords) {
        if (text.includes(kw)) score += 2;
      }
      if (p.metric) score += 4;
      if (p.starStory) score += 4;
      return { project: p, score };
    });

    scoredProjects.sort((a, b) => b.score - a.score);

    // Pick top 3 projects to talk about
    const top3Projects = scoredProjects.slice(0, 3).map((item) => {
      const p = item.project;
      const star = p.starStory as { situation?: string; task?: string; action?: string; result?: string } | null;

      return {
        id: p.id,
        title: p.title,
        problem: p.problem || p.description,
        role: p.role || "Lead Contributor",
        tools: p.tools,
        outcome: p.outcome,
        metric: p.metric,
        resumeBullet: p.resumeBullet,
        starStory: star || {
          situation: p.problem || "Coursework challenge",
          task: "Strategic mandate and execution",
          action: p.method || "Analyzed real data and synthesized recommendations",
          result: p.outcome || "Delivered project artifacts",
        },
        isSignature: p.isSignature,
        semesterName: p.term?.name || "Semester 1",
      };
    });

    // 3. Generate 10 likely questions grounded strictly in the real topics and projects
    const questions: { id: string; question: string; contextType: "topic" | "project"; source: string }[] = [];

    // Project-based behavioral & technical questions (3-4 questions)
    top3Projects.forEach((proj, idx) => {
      questions.push({
        id: `q-proj-${idx}-1`,
        question: `Tell me about your project "${proj.title}". How did you decide on the methodology, and what was your specific contribution as ${proj.role}?`,
        contextType: "project",
        source: proj.title,
      });

      if (proj.metric) {
        questions.push({
          id: `q-proj-${idx}-2`,
          question: `In "${proj.title}", you achieved ${proj.metric}. What trade-offs or pushback did you encounter, and how did you validate that outcome?`,
          contextType: "project",
          source: proj.title,
        });
      }
    });

    // Topic-based conceptual, case, and strategic questions
    top10Topics.forEach((top, idx) => {
      if (questions.length < 10) {
        const questionTemplates = [
          `In your coursework on ${top.subjectName}, how would you apply the principles of ${top.name} to a real-world scenario at ${company}?`,
          `How would you explain ${top.name} and its strategic implications to an executive stakeholder at ${company}?`,
          `Can you walk through a case situation where relying on ${top.name} might fail or produce unintended second-order consequences?`,
          `Given your mastery of ${top.name} (${top.subjectCode}), what key metrics or KPIs would you monitor to measure success in a ${role} role?`,
        ];
        const template = questionTemplates[idx % questionTemplates.length];
        questions.push({
          id: `q-top-${idx}`,
          question: template,
          contextType: "topic",
          source: `${top.subjectCode}: ${top.name}`,
        });
      }
    });

    const prepPack = {
      role,
      company,
      generatedAt: new Date().toISOString(),
      topicsToRevise: top10Topics,
      projectsToHighlight: top3Projects,
      anticipatedQuestions: questions.slice(0, 10),
    };

    return NextResponse.json({ prepPack });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate interview prep pack" },
      { status: 500 }
    );
  }
}
