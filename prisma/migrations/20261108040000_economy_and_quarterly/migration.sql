-- AlterTable Subject
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "ipoCelebrated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "ipoDate" TIMESTAMP(3);

-- AlterTable Squad
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "conglomerateIndex" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "weeklyRecoveredValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable SquadMember
ALTER TABLE "SquadMember" ADD COLUMN IF NOT EXISTS "weeklyContribution" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "SquadMember" ADD COLUMN IF NOT EXISTS "activityLevel" TEXT NOT NULL DEFAULT 'Normal';
ALTER TABLE "SquadMember" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable CreditRatingAudit
CREATE TABLE IF NOT EXISTS "CreditRatingAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "previousRating" TEXT,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditRatingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable BridgeLoan
CREATE TABLE IF NOT EXISTS "BridgeLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuarterlyReport
CREATE TABLE IF NOT EXISTS "QuarterlyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "revenueGained" DOUBLE PRECISION NOT NULL,
    "depreciationLoss" DOUBLE PRECISION NOT NULL,
    "netValueChange" DOUBLE PRECISION NOT NULL,
    "bestDepartment" TEXT NOT NULL,
    "worstDepartment" TEXT NOT NULL,
    "creditRating" TEXT NOT NULL,
    "creditRatingDelta" TEXT NOT NULL,
    "conceptsAtRisk" JSONB NOT NULL,
    "ceoLetter" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditRatingAudit_userId_timestamp_idx" ON "CreditRatingAudit"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "BridgeLoan_userId_date_idx" ON "BridgeLoan"("userId", "date");
CREATE INDEX IF NOT EXISTS "QuarterlyReport_userId_createdAt_idx" ON "QuarterlyReport"("userId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CreditRatingAudit_userId_fkey'
    ) THEN
        ALTER TABLE "CreditRatingAudit" ADD CONSTRAINT "CreditRatingAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BridgeLoan_userId_fkey'
    ) THEN
        ALTER TABLE "BridgeLoan" ADD CONSTRAINT "BridgeLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'QuarterlyReport_userId_fkey'
    ) THEN
        ALTER TABLE "QuarterlyReport" ADD CONSTRAINT "QuarterlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
