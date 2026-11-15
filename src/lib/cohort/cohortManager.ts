import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export interface CreateCohortInput {
  name: string;
  program?: string;
  year?: number;
  maxMembers?: number;
  monthlyAiCap?: number;
  adminUserId: string;
}

/**
 * Creates a new student cohort with an invite code and default settings.
 */
export async function createCohort(input: CreateCohortInput) {
  const inviteCode = nanoid(8).toUpperCase();
  const inviteLinkExpiry = new Date();
  inviteLinkExpiry.setDate(inviteLinkExpiry.getDate() + 30); // 30-day default expiry

  const cohort = await prisma.cohort.create({
    data: {
      name: input.name.trim(),
      program: input.program || "MBA",
      year: input.year || 2026,
      inviteCode,
      inviteLinkExpiry,
      maxMembers: input.maxMembers || 100,
      monthlyAiCap: input.monthlyAiCap || 50.0,
      adminId: input.adminUserId,
      members: {
        create: {
          userId: input.adminUserId,
          role: "Admin",
        },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return cohort;
}

/**
 * Joins a cohort using an invite code and pre-fills subjects and timetable entries.
 */
export async function joinCohortByCode(userId: string, inviteCode: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: {
      timetableEntries: true,
      deadlines: true,
      members: true,
    },
  });

  if (!cohort) {
    throw new Error("Invalid class invite code");
  }

  if (cohort.inviteLinkExpiry && cohort.inviteLinkExpiry < new Date()) {
    throw new Error("This class invite link has expired. Request a new link from your class admin.");
  }

  if (cohort.members.length >= cohort.maxMembers) {
    throw new Error("This class has reached its maximum member capacity.");
  }

  // Add user to cohort member roster
  const membership = await prisma.cohortMember.upsert({
    where: {
      cohortId_userId: { cohortId: cohort.id, userId },
    },
    create: {
      cohortId: cohort.id,
      userId,
      role: "Student",
    },
    update: {},
  });

  // Pre-fill user timetable from common cohort timetable
  for (const entry of cohort.timetableEntries) {
    // Find or create subject for user
    let userSubject = await prisma.subject.findFirst({
      where: { userId, code: entry.subjectCode },
    });

    if (!userSubject) {
      userSubject = await prisma.subject.create({
        data: {
          userId,
          code: entry.subjectCode,
          name: entry.subjectName,
          sharePrice: 50.0,
        },
      });
    }

    // Add timetable entry if not already present
    const existingEntry = await prisma.timetableEntry.findFirst({
      where: {
        userId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        subjectId: userSubject.id,
      },
    });

    if (!existingEntry) {
      await prisma.timetableEntry.create({
        data: {
          userId,
          subjectId: userSubject.id,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          room: entry.room,
        },
      });
    }
  }

  return {
    cohort,
    membership,
    prefilledEntriesCount: cohort.timetableEntries.length,
  };
}

/**
 * Shares a processed deck with the cohort library.
 * The deck is processed ONCE. Each member who adopts it gets their own cards and independent review schedule.
 */
export async function shareDeckWithCohort(
  deckId: string,
  cohortId: string,
  userId: string,
  noticeAccepted: boolean
) {
  if (!noticeAccepted) {
    throw new Error("You must confirm this deck is for enrolled section students only.");
  }

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { slides: { include: { cards: true } }, subject: true },
  });

  if (!deck) throw new Error("Deck not found");

  const shared = await prisma.sharedCohortDeck.upsert({
    where: {
      cohortId_deckId: { cohortId, deckId },
    },
    create: {
      cohortId,
      deckId,
      sharedByUserId: userId,
      noticeAccepted: true,
    },
    update: {
      noticeAccepted: true,
      sharedAt: new Date(),
    },
  });

  // Mark deck as shared with cohort
  await prisma.deck.update({
    where: { id: deckId },
    data: { isSharedWithCohort: true },
  });

  return shared;
}

/**
 * Adopts a shared cohort deck for an individual member.
 * Generates their own private flashcard review queue copies with fresh FSRS parameters.
 */
export async function adoptSharedDeckForMember(
  deckId: string,
  memberUserId: string
) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      subject: true,
      slides: {
        include: {
          cards: { include: { concept: true } },
        },
      },
    },
  });

  if (!deck) throw new Error("Deck not found");

  // Ensure member has this subject in their company ledger
  let memberSubject = await prisma.subject.findFirst({
    where: { userId: memberUserId, code: deck.subject.code },
  });

  if (!memberSubject) {
    memberSubject = await prisma.subject.create({
      data: {
        userId: memberUserId,
        code: deck.subject.code,
        name: deck.subject.name,
        sharePrice: 50.0,
      },
    });
  }

  let cardsCreatedCount = 0;

  for (const slide of deck.slides) {
    for (const card of slide.cards) {
      // Find or create concept in member's department
      let memberConcept = null;
      if (card.concept) {
        memberConcept = await prisma.concept.findFirst({
          where: { subjectId: memberSubject.id, name: card.concept.name },
        });

        if (!memberConcept) {
          memberConcept = await prisma.concept.create({
            data: {
              subjectId: memberSubject.id,
              name: card.concept.name,
              definition: card.concept.definition || `Concept extracted from deck: ${deck.title}`,
              value: 50.0,
              stability: 1.0,
              difficulty: 5.0,
            },
          });
        }
      }

      // Check if user already adopted this card
      const existingCard = await prisma.card.findFirst({
        where: {
          sourceSlideId: slide.id,
          conceptId: memberConcept?.id,
          front: card.front,
        },
      });

      if (!existingCard && memberConcept) {
        await prisma.card.create({
          data: {
            sourceSlideId: slide.id,
            conceptId: memberConcept.id,
            type: card.type,
            front: card.front,
            back: card.back,
            due: new Date(), // due immediately for first review sprint
            stability: 1.0,
            difficulty: 5.0,
            reps: 0,
            state: 0,
          },
        });
        cardsCreatedCount++;
      }
    }
  }

  return {
    adoptedDeckId: deckId,
    cardsCreatedCount,
    subjectCode: memberSubject.code,
  };
}
