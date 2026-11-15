-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyAiBudgetCost" DOUBLE PRECISION NOT NULL DEFAULT 0.50;

-- AlterTable MockInterview
ALTER TABLE "MockInterview" ADD COLUMN IF NOT EXISTS "conceptId" TEXT;
ALTER TABLE "MockInterview" ADD COLUMN IF NOT EXISTS "coldCallType" TEXT;
ALTER TABLE "MockInterview" ADD COLUMN IF NOT EXISTS "structureScore" DOUBLE PRECISION;
ALTER TABLE "MockInterview" ADD COLUMN IF NOT EXISTS "insightScore" DOUBLE PRECISION;
ALTER TABLE "MockInterview" ADD COLUMN IF NOT EXISTS "evidenceScore" DOUBLE PRECISION;

-- CreateTable ExamPlan
CREATE TABLE IF NOT EXISTS "ExamPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "scopeDeckIds" JSONB,
    "daysPlan" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MockInterview_conceptId_idx" ON "MockInterview"("conceptId");
CREATE INDEX IF NOT EXISTS "ExamPlan_userId_idx" ON "ExamPlan"("userId");
CREATE INDEX IF NOT EXISTS "ExamPlan_subjectId_idx" ON "ExamPlan"("subjectId");
CREATE INDEX IF NOT EXISTS "ExamPlan_examDate_idx" ON "ExamPlan"("examDate");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterview_conceptId_fkey'
    ) THEN
        ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ExamPlan_userId_fkey'
    ) THEN
        ALTER TABLE "ExamPlan" ADD CONSTRAINT "ExamPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ExamPlan_subjectId_fkey'
    ) THEN
        ALTER TABLE "ExamPlan" ADD CONSTRAINT "ExamPlan_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
