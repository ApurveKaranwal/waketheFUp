import { createClerkClient } from "@clerk/backend";
import { prisma } from "../config/db";
import { logError, logInfo, safeErrorSummary } from "../logger";

const MAX_DELETIONS_PER_RUN = 50;

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}

export function isIdentityAlreadyDeleted(error: unknown): boolean {
  return getHttpStatus(error) === 404;
}

export function accountDeletionRetryAt(now: Date, attempts: number): Date {
  const delayMs = Math.min(24 * 60 * 60_000, 30_000 * 2 ** Math.min(Math.max(0, attempts), 12));
  return new Date(now.getTime() + delayMs);
}

export async function requestAccountDeletion(userId: string, clerkId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(0, hashtext(${clerkId}))`;
    await tx.accountDeletion.upsert({
      where: { clerkId },
      create: { clerkId },
      update: { nextAttemptAt: new Date(), completedAt: null },
    });
    await tx.user.delete({ where: { id: userId } });
  });
}

export async function processPendingAccountDeletions(): Promise<number> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Clerk account deletion is not configured.");

  const pending = await prisma.accountDeletion.findMany({
    where: { completedAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { requestedAt: "asc" },
    take: MAX_DELETIONS_PER_RUN,
    select: { clerkId: true, attempts: true },
  });
  if (pending.length === 0) return 0;

  const clerk = createClerkClient({ secretKey });
  let completed = 0;
  for (const deletion of pending) {
    try {
      await clerk.users.deleteUser(deletion.clerkId);
      await prisma.accountDeletion.update({
        where: { clerkId: deletion.clerkId },
        data: { completedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      completed += 1;
    } catch (error) {
      if (isIdentityAlreadyDeleted(error)) {
        await prisma.accountDeletion.update({
          where: { clerkId: deletion.clerkId },
          data: { completedAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
        completed += 1;
        continue;
      }

      const nextAttemptAt = accountDeletionRetryAt(new Date(), deletion.attempts);
      await prisma.accountDeletion.update({
        where: { clerkId: deletion.clerkId },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt,
          lastError: safeErrorSummary(error),
        },
      });
      logError("account_deletion.provider_failed", error);
    }
  }

  if (completed > 0) logInfo("account_deletion.provider_completed", { count: completed });
  return completed;
}
