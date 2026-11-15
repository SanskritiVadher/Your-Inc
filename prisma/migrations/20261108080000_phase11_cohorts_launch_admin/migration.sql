-- AlterTable: User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstReviewCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reviewsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Cohort
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "inviteLinkExpiry" TIMESTAMP(3);
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "monthlyAiCap" DOUBLE PRECISION NOT NULL DEFAULT 50.0;
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Cohort_inviteCode_key" ON "Cohort"("inviteCode");

-- CreateTable: SharedCohortDeck
CREATE TABLE IF NOT EXISTS "SharedCohortDeck" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "noticeAccepted" BOOLEAN NOT NULL DEFAULT true,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedCohortDeck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SharedCohortDeck_cohortId_deckId_key" ON "SharedCohortDeck"("cohortId", "deckId");
CREATE INDEX IF NOT EXISTS "SharedCohortDeck_cohortId_idx" ON "SharedCohortDeck"("cohortId");
CREATE INDEX IF NOT EXISTS "SharedCohortDeck_sharedByUserId_idx" ON "SharedCohortDeck"("sharedByUserId");

-- CreateTable: CohortTimetableEntry
CREATE TABLE IF NOT EXISTS "CohortTimetableEntry" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortTimetableEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CohortTimetableEntry_cohortId_idx" ON "CohortTimetableEntry"("cohortId");

-- CreateTable: CohortDeadline
CREATE TABLE IF NOT EXISTS "CohortDeadline" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "format" TEXT NOT NULL DEFAULT 'Report',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortDeadline_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CohortDeadline_cohortId_idx" ON "CohortDeadline"("cohortId");

-- CreateTable: HiddenCohortItem
CREATE TABLE IF NOT EXISTS "HiddenCohortItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,

    CONSTRAINT "HiddenCohortItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HiddenCohortItem_userId_itemId_key" ON "HiddenCohortItem"("userId", "itemId");
CREATE INDEX IF NOT EXISTS "HiddenCohortItem_userId_idx" ON "HiddenCohortItem"("userId");

-- CreateTable: Feedback
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "aiRating" BOOLEAN,
    "ratingReason" TEXT,
    "contextUrl" TEXT,
    "browser" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "aiThemeCluster" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_userId_idx" ON "Feedback"("userId");
CREATE INDEX IF NOT EXISTS "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");

-- CreateTable: FeatureFlag
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- Foreign Keys
ALTER TABLE "SharedCohortDeck" ADD CONSTRAINT "SharedCohortDeck_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedCohortDeck" ADD CONSTRAINT "SharedCohortDeck_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedCohortDeck" ADD CONSTRAINT "SharedCohortDeck_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CohortTimetableEntry" ADD CONSTRAINT "CohortTimetableEntry_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortDeadline" ADD CONSTRAINT "CohortDeadline_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HiddenCohortItem" ADD CONSTRAINT "HiddenCohortItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
