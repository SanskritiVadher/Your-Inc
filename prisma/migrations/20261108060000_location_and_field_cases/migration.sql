-- AlterTable: Subject
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "minAttendancePercent" DOUBLE PRECISION NOT NULL DEFAULT 75.0;

-- AlterTable: StudySession
ALTER TABLE "StudySession" ADD COLUMN IF NOT EXISTS "cardsPerMin" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable: Geofence
ALTER TABLE "Geofence" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CLASSROOM';
ALTER TABLE "Geofence" ADD COLUMN IF NOT EXISTS "centerLat" DOUBLE PRECISION;
ALTER TABLE "Geofence" ADD COLUMN IF NOT EXISTS "centerLng" DOUBLE PRECISION;
ALTER TABLE "Geofence" ADD COLUMN IF NOT EXISTS "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 100.0;

-- CreateTable: LocationPermission
CREATE TABLE IF NOT EXISTS "LocationPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "focusMapEnabled" BOOLEAN NOT NULL DEFAULT false,
    "studyZoneRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fieldCasesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AttendanceRecord
CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "timetableEntryId" TEXT,
    "geofenceId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "gpsAccuracyMeters" DOUBLE PRECISION,
    "rawLat" DOUBLE PRECISION,
    "rawLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FieldCase
CREATE TABLE IF NOT EXISTS "FieldCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "areaName" TEXT NOT NULL,
    "businessContext" JSONB NOT NULL,
    "casePrompt" TEXT NOT NULL,
    "studentAnswer" TEXT,
    "feedback" TEXT,
    "score" DOUBLE PRECISION,
    "reinvestmentGain" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OverpassCache
CREATE TABLE IF NOT EXISTS "OverpassCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverpassCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "LocationPermission_userId_key" ON "LocationPermission"("userId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_userId_idx" ON "AttendanceRecord"("userId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_subjectId_idx" ON "AttendanceRecord"("subjectId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_checkInTime_idx" ON "AttendanceRecord"("checkInTime");
CREATE INDEX IF NOT EXISTS "FieldCase_userId_idx" ON "FieldCase"("userId");
CREATE INDEX IF NOT EXISTS "FieldCase_completed_idx" ON "FieldCase"("completed");
CREATE UNIQUE INDEX IF NOT EXISTS "OverpassCache_cacheKey_key" ON "OverpassCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "OverpassCache_expiresAt_idx" ON "OverpassCache"("expiresAt");
