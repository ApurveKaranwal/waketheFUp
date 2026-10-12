import { Worker, type Job } from "bullmq";
import { redis } from "../config/redis";
import { prisma } from "../config/db";
import { emailQueue } from "../queues/emailQueue";
import { sendMonitorAlert, verifyEmailTransport } from "../services/emailService";
import { recordAlert } from "../services/metrics";
import { logError, safeErrorSummary } from "../logger";
import { processPendingAccountDeletions } from "../services/accountDeletion";

const EMAIL_DISPATCH_INTERVAL_MS = 15_000;
const ACCOUNT_DELETION_DISPATCH_INTERVAL_MS = 60_000;
const MAX_DISPATCH_BATCH = 100;
const HEARTBEAT_KEY = "wtfup:health:email-worker";
const SMTP_HEALTH_KEY = "wtfup:health:smtp";

async function setHealth(key: string, value: string) {
  try {
    await redis.set(key, value, "EX", 30);
  } catch (error) {
    logError("email.health_update_failed", error);
  }
}

async function dispatchPendingAlerts() {
  const alerts = await prisma.emailAlert.findMany({
    where: { sentAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: MAX_DISPATCH_BATCH,
    select: { id: true },
  });

  if (alerts.length === 0) return;

  await emailQueue.addBulk(
    alerts.map((alert) => ({
      name: "send-email-alert",
      data: { alertId: alert.id },
      opts: {
        jobId: alert.id,
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: true,
      },
    }))
  );
}

async function sendPendingAlert(alertId: string) {
  const alert = await prisma.emailAlert.findUnique({
    where: { id: alertId },
  });
  if (!alert || alert.sentAt) return;

  try {
    await sendMonitorAlert({
      to: alert.recipient,
      projectName: alert.projectName,
      projectUrl: alert.projectUrl,
      event: alert.event,
      checkedAt: alert.createdAt,
      status: alert.status,
      responseTime: alert.responseTime,
    });
    await prisma.emailAlert.update({
      where: { id: alert.id },
      data: { sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
    recordAlert(alert.event, alert.projectId);
    await setHealth(SMTP_HEALTH_KEY, "ok");
  } catch (error) {
    await setHealth(SMTP_HEALTH_KEY, "unavailable");
    const message = safeErrorSummary(error);
    const isPermanentRejection = (error as { code?: string })?.code === "EMESSAGE" && alert.attempts >= 2;
    const isExhausted = alert.attempts >= 4 || isPermanentRejection;

    await prisma.emailAlert.update({
      where: { id: alert.id },
      data: {
        attempts: { increment: 1 },
        lastError: message,
        ...(isExhausted
          ? { sentAt: new Date() } // Mark resolved to stop loop
          : { nextAttemptAt: new Date(Date.now() + Math.min(30 * 60_000, 15_000 * (2 ** alert.attempts))) }
        ),
      },
    });

    if (!isExhausted) {
      throw error;
    }
  }
}


export async function startEmailAlertWorker() {
  await emailQueue.upsertJobScheduler(
    "email-alert-dispatcher",
    { every: EMAIL_DISPATCH_INTERVAL_MS },
    {
      name: "dispatch-email-alerts",
      data: {},
      opts: { removeOnComplete: true, removeOnFail: true },
    },
  );
  await emailQueue.upsertJobScheduler(
    "account-deletion-dispatcher",
    { every: ACCOUNT_DELETION_DISPATCH_INTERVAL_MS },
    {
      name: "process-account-deletions",
      data: {},
      opts: { removeOnComplete: 100, removeOnFail: 100 },
    },
  );

  const worker = new Worker(
    "emailAlertQueue",
    async (job: Job) => {
      if (job.name === "dispatch-email-alerts") {
        await dispatchPendingAlerts();
        return;
      }
      if (job.name === "process-account-deletions") {
        await processPendingAccountDeletions();
        return;
      }

      await sendPendingAlert(job.data.alertId);
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on("failed", (job, error) => {
    logError("email.job_failed", error, { jobId: String(job?.id ?? "unknown") });
  });
  worker.on("error", (error) => logError("email.worker_error", error));

  await worker.waitUntilReady();
  try {
    await verifyEmailTransport();
    await setHealth(SMTP_HEALTH_KEY, "ok");
  } catch (error) {
    await setHealth(SMTP_HEALTH_KEY, "unavailable");
    logError("email.smtp_readiness_failed", error);
  }

  const publishHeartbeat = () => {
    if (worker.isRunning()) void setHealth(HEARTBEAT_KEY, "ready");
  };
  publishHeartbeat();
  const heartbeat = setInterval(publishHeartbeat, 10_000);
  heartbeat.unref?.();

  return {
    close: async () => {
      clearInterval(heartbeat);
      await worker.close();
    },
  };
}
