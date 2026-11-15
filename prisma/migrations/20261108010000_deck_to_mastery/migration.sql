-- AlterTable Deck
ALTER TABLE "Deck" ADD COLUMN "userId" TEXT;
ALTER TABLE "Deck" ADD COLUMN "fileHash" TEXT;
ALTER TABLE "Deck" ADD COLUMN "summary" TEXT;
ALTER TABLE "Deck" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "Deck" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Deck" ADD COLUMN "isSharedWithCohort" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Deck" ADD COLUMN "sessionStatus" TEXT NOT NULL DEFAULT 'Untouched';

-- AlterTable Slide
ALTER TABLE "Slide" ADD COLUMN "hasGap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Slide" ADD COLUMN "gapReason" TEXT;
ALTER TABLE "Slide" ADD COLUMN "studentExplanation" TEXT;
ALTER TABLE "Slide" ADD COLUMN "personalNotes" TEXT;

-- CreateIndex
CREATE INDEX "Deck_fileHash_idx" ON "Deck"("fileHash");
