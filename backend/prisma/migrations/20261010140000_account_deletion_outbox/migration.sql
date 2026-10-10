-- Keep a minimal Clerk ID tombstone so a still-valid access token cannot
-- recreate an account while the provider-side deletion is being retried.
CREATE TABLE "AccountDeletion" (
    "clerkId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletion_pkey" PRIMARY KEY ("clerkId")
);

CREATE INDEX "AccountDeletion_completedAt_nextAttemptAt_idx"
ON "AccountDeletion"("completedAt", "nextAttemptAt");
