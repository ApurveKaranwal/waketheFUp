-- CreateEnum
CREATE TYPE "AlertEvent" AS ENUM ('CREATED', 'DOWN', 'RECOVERED');

-- DropIndex
DROP INDEX "PingHistory_projectId_idx";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "incidentNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isDown" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmailAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "event" "AlertEvent" NOT NULL,
    "incidentNumber" INTEGER NOT NULL,
    "recipient" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "status" INTEGER,
    "responseTime" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAlert_sentAt_nextAttemptAt_idx" ON "EmailAlert"("sentAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAlert_projectId_incidentNumber_event_key" ON "EmailAlert"("projectId", "incidentNumber", "event");

-- CreateIndex
CREATE INDEX "PingHistory_projectId_checkedAt_idx" ON "PingHistory"("projectId", "checkedAt");
CREATE INDEX "PingHistory_checkedAt_id_idx" ON "PingHistory"("checkedAt", "id");

-- CreateIndex
CREATE INDEX "Project_enabled_id_idx" ON "Project"("enabled", "id");

-- AddForeignKey
ALTER TABLE "EmailAlert" ADD CONSTRAINT "EmailAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

