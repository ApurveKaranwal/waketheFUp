-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailAlert_sentAt_nextAttemptAt_createdAt_idx" ON "EmailAlert"("sentAt", "nextAttemptAt", "createdAt");
