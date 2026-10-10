import { prisma } from "../config/db";

const BATCH_SIZE = 5_000;
const MAX_BATCHES_PER_RUN = 20;
const DELETION_TOMBSTONE_RETENTION_DAYS = 30;

function getRetentionDays(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 3_650) {
    throw new Error(`${name} must be an integer between 1 and 3650.`);
  }
  return value;
}

export function validateRetentionConfig(): void {
  getRetentionDays("PING_HISTORY_RETENTION_DAYS", 90);
  getRetentionDays("EMAIL_ALERT_RETENTION_DAYS", 90);
}

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1_000);
}

async function deleteOldHistory(cutoff: Date): Promise<number> {
  let total = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deleted = await prisma.$executeRaw`
      WITH victims AS (
        SELECT "id" FROM "PingHistory"
        WHERE "checkedAt" < ${cutoff}
        ORDER BY "checkedAt" ASC, "id" ASC
        LIMIT ${BATCH_SIZE}
      )
      DELETE FROM "PingHistory" AS history
      USING victims
      WHERE history."id" = victims."id"
    `;
    total += Number(deleted);
    if (Number(deleted) < BATCH_SIZE) break;
  }
  return total;
}

async function deleteSentAlerts(cutoff: Date): Promise<number> {
  let total = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deleted = await prisma.$executeRaw`
      WITH victims AS (
        SELECT "id" FROM "EmailAlert"
        WHERE "sentAt" IS NOT NULL AND "sentAt" < ${cutoff}
        ORDER BY "sentAt" ASC, "id" ASC
        LIMIT ${BATCH_SIZE}
      )
      DELETE FROM "EmailAlert" AS alert
      USING victims
      WHERE alert."id" = victims."id"
    `;
    total += Number(deleted);
    if (Number(deleted) < BATCH_SIZE) break;
  }
  return total;
}

async function deleteCompletedAccountTombstones(cutoff: Date): Promise<number> {
  let total = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deleted = await prisma.$executeRaw`
      WITH victims AS (
        SELECT "clerkId" FROM "AccountDeletion"
        WHERE "completedAt" IS NOT NULL AND "completedAt" < ${cutoff}
        ORDER BY "completedAt" ASC, "clerkId" ASC
        LIMIT ${BATCH_SIZE}
      )
      DELETE FROM "AccountDeletion" AS deletion
      USING victims
      WHERE deletion."clerkId" = victims."clerkId"
    `;
    total += Number(deleted);
    if (Number(deleted) < BATCH_SIZE) break;
  }
  return total;
}

export async function cleanupRetainedData(now = new Date()) {
  validateRetentionConfig();
  const historyDays = getRetentionDays("PING_HISTORY_RETENTION_DAYS", 90);
  const alertDays = getRetentionDays("EMAIL_ALERT_RETENTION_DAYS", 90);
  const [historyDeleted, alertsDeleted, accountDeletionsDeleted] = await Promise.all([
    deleteOldHistory(retentionCutoff(now, historyDays)),
    deleteSentAlerts(retentionCutoff(now, alertDays)),
    deleteCompletedAccountTombstones(retentionCutoff(now, DELETION_TOMBSTONE_RETENTION_DAYS)),
  ]);

  return { historyDeleted, alertsDeleted, accountDeletionsDeleted };
}
