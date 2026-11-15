import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getEffectiveDate } from "@/lib/fsrs";
import { calculateDeadlineRiskScore } from "./riskScore";

export interface MorningBriefData {
  id?: string;
  date: string;
  classes: {
    subjectCode: string;
    subjectName: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
  dueReviewsCount: number;
  highestRiskDeadline?: {
    id: string;
    title: string;
    subjectCode: string;
    daysLeft: number;
    riskScore: number;
    weight: number;
    urgencyLevel: string;
  } | null;
  coldCallQuestion?: {
    question: string;
    subjectCode: string;
    conceptName: string;
  } | null;
  professorNote?: string | null;
  readTimeSeconds: number;
}

/**
 * Generates the student's Daily Morning Dossier / Morning Brief (under 30 seconds to read).
 */
export async function getOrGenerateMorningBrief(userId: string): Promise<MorningBriefData> {
  const effectiveNow = await getEffectiveDate(userId);
  const startOfDay = new Date(effectiveNow);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(effectiveNow);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if today's brief was already generated
  const existing = await prisma.morningBrief.findFirst({
    where: {
      userId,
      date: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      id: existing.id,
      date: existing.date.toISOString(),
      classes: existing.classes as unknown as MorningBriefData["classes"],
      dueReviewsCount: existing.dueReviewsCount,
      highestRiskDeadline: existing.highestRiskDeadline as unknown as MorningBriefData["highestRiskDeadline"],
      coldCallQuestion: existing.coldCallQuestion as unknown as MorningBriefData["coldCallQuestion"],
      professorNote: existing.professorNote,
      readTimeSeconds: existing.readTimeSeconds,
    };
  }

  // 1. Today's Classes from Timetable
  const dayOfWeek = effectiveNow.getDay() || 7; // 1: Mon .. 7: Sun
  const todayClasses = await prisma.timetableEntry.findMany({
    where: {
      userId,
      dayOfWeek,
    },
    include: {
      subject: { select: { code: true, name: true, id: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const formattedClasses = todayClasses.map((c) => ({
    subjectCode: c.subject.code,
    subjectName: c.subject.name,
    startTime: c.startTime,
    endTime: c.endTime,
    room: c.room || "Main Lecture Hall",
  }));

  // 2. Due Reviews Count
  const dueCardsCount = await prisma.card.count({
    where: {
      due: { lte: effectiveNow },
      concept: { subject: { userId } },
    },
  });

  // 3. Highest Risk Deadline
  const upcomingAssignments = await prisma.assignment.findMany({
    where: {
      userId,
      status: { not: "SUBMITTED" },
    },
    include: {
      subject: { select: { code: true } },
    },
  });

  let highestRisk: MorningBriefData["highestRiskDeadline"] = null;
  let maxRisk = -1;

  for (const a of upcomingAssignments) {
    const { riskScore, daysLeft, urgencyLevel } = calculateDeadlineRiskScore(
      a.weight,
      a.progress,
      a.deadline,
      effectiveNow
    );

    if (riskScore > maxRisk) {
      maxRisk = riskScore;
      highestRisk = {
        id: a.id,
        title: a.title,
        subjectCode: a.subject.code,
        daysLeft,
        riskScore,
        weight: a.weight,
        urgencyLevel,
      };
    }
  }

  // 4. One Cold Call Question
  const sampleQuestion = await prisma.question.findFirst({
    where: {
      type: "CASE",
      subject: { userId },
    },
    include: {
      subject: { select: { code: true, name: true } },
    },
  });

  const coldCallQuestion = sampleQuestion
    ? {
        question: sampleQuestion.text,
        subjectCode: sampleQuestion.subject.code,
        conceptName: `${sampleQuestion.subject.name} Case Strategy`,
      }
    : formattedClasses[0]
    ? {
        question: "How would you approach the core strategic framework for today's case study discussion?",
        subjectCode: formattedClasses[0].subjectCode,
        conceptName: `${formattedClasses[0].subjectCode} Discussion Preparation`,
      }
    : null;

  // 5. Relevant line from Memory for today's classes
  let professorNote: string | null = null;
  const todaySubjectIds = todayClasses.map((c) => c.subject.id);

  if (todaySubjectIds.length > 0) {
    const memory = await prisma.memoryEntry.findFirst({
      where: {
        subjectId: { in: todaySubjectIds },
      },
      orderBy: { createdAt: "desc" },
    });
    if (memory) {
      professorNote = memory.content;
    }
  }

  if (!professorNote) {
    const generalMemory = await prisma.memoryEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (generalMemory) {
      professorNote = generalMemory.content;
    }
  }

  // Save to DB
  const createdBrief = await prisma.morningBrief.create({
    data: {
      userId,
      date: effectiveNow,
      classes: formattedClasses,
      dueReviewsCount: dueCardsCount,
      highestRiskDeadline: highestRisk ? (highestRisk as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      coldCallQuestion: coldCallQuestion as unknown as Prisma.InputJsonValue,
      professorNote,
      readTimeSeconds: 25,
    },
  });

  return {
    id: createdBrief.id,
    date: createdBrief.date.toISOString(),
    classes: formattedClasses,
    dueReviewsCount: dueCardsCount,
    highestRiskDeadline: highestRisk,
    coldCallQuestion,
    professorNote,
    readTimeSeconds: 25,
  };
}
