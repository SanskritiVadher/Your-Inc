-- AlterTable: Assignment
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "evaluationComponentId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "deliverableFormat" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "customStatus" TEXT NOT NULL DEFAULT 'Not started';
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "briefText" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable: GroupProject
ALTER TABLE "GroupProject" ADD COLUMN IF NOT EXISTS "fileLinks" JSONB;

-- AlterTable: GroupMember
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "onTimeTasksCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "lateTasksCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "filesAddedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'TODO';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isOverdue" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: TimetableEntry
CREATE TABLE IF NOT EXISTS "TimetableEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MeetingNote
CREATE TABLE IF NOT EXISTS "MeetingNote" (
    "id" TEXT NOT NULL,
    "groupProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "decisions" JSONB,
    "actionItems" JSONB,
    "openQuestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationSettings
CREATE TABLE IF NOT EXISTS "NotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyDeadline48h" BOOLEAN NOT NULL DEFAULT true,
    "notifyDeadline6h" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReviews" BOOLEAN NOT NULL DEFAULT true,
    "reviewReminderTime" TEXT NOT NULL DEFAULT '18:00',
    "notifyGroupTasks" BOOLEAN NOT NULL DEFAULT true,
    "notifyMeetingActions" BOOLEAN NOT NULL DEFAULT true,
    "calendarExportToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MorningBrief
CREATE TABLE IF NOT EXISTS "MorningBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classes" JSONB NOT NULL,
    "dueReviewsCount" INTEGER NOT NULL DEFAULT 0,
    "highestRiskDeadline" JSONB,
    "coldCallQuestion" JSONB,
    "professorNote" TEXT,
    "readTimeSeconds" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MorningBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "Assignment_evaluationComponentId_idx" ON "Assignment"("evaluationComponentId");
CREATE INDEX IF NOT EXISTS "Task_ownerId_idx" ON "Task"("ownerId");
CREATE INDEX IF NOT EXISTS "TimetableEntry_userId_idx" ON "TimetableEntry"("userId");
CREATE INDEX IF NOT EXISTS "TimetableEntry_subjectId_idx" ON "TimetableEntry"("subjectId");
CREATE INDEX IF NOT EXISTS "TimetableEntry_dayOfWeek_idx" ON "TimetableEntry"("dayOfWeek");
CREATE INDEX IF NOT EXISTS "MeetingNote_groupProjectId_idx" ON "MeetingNote"("groupProjectId");
CREATE INDEX IF NOT EXISTS "MeetingNote_userId_idx" ON "MeetingNote"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_sentAt_idx" ON "Notification"("sentAt");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSettings_userId_key" ON "NotificationSettings"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSettings_calendarExportToken_key" ON "NotificationSettings"("calendarExportToken");
CREATE INDEX IF NOT EXISTS "MorningBrief_userId_idx" ON "MorningBrief"("userId");
CREATE INDEX IF NOT EXISTS "MorningBrief_date_idx" ON "MorningBrief"("date");
