import { Worker, type Job } from "bullmq";
import { redis } from "../config/redis";
import pingService from "../services/pingService";
import { prisma } from "../config/db";
import { reconcileProjectSchedulers, SCHEDULER_RECONCILER_ID } from "../services/projectScheduler";
import { pingQueue } from "../queues/pingQueue";
import { cleanupRetainedData, validateRetentionConfig } from "../services/retentionService";
import { recordCheck } from "../services/metrics";
import { logError, logInfo } from "../logger";

const RETENTION_CLEANUP_ID = "retained-data-cleanup";
const RETENTION_CLEANUP_INTERVAL_MS = 15 * 60_000;
const HEARTBEAT_KEY = "wtfup:health:ping-worker";

export async function startPingWorker() {
  validateRetentionConfig();
  await reconcileProjectSchedulers();
  await pingQueue.upsertJobScheduler(
    SCHEDULER_RECONCILER_ID,
    { every: 180_000 },
    {
      name: "reconcile-project-schedulers",
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 5, age: 3600 },
        removeOnFail: { count: 10, age: 86400 },
      },
    },
  );
  await pingQueue.upsertJobScheduler(
    RETENTION_CLEANUP_ID,
    { every: RETENTION_CLEANUP_INTERVAL_MS },
    {
      name: "cleanup-retained-data",
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 5, age: 3600 },
        removeOnFail: { count: 10, age: 86400 },
      },
    },
  );

  const pingWorker = new Worker(
    "pingQueue",
    async (job: Job) => {
      if (job.name === "reconcile-project-schedulers") {
        await reconcileProjectSchedulers();
        return;
      }
      if (job.name === "cleanup-retained-data") {
        const result = await cleanupRetainedData();
        if (result.historyDeleted || result.alertsDeleted || result.accountDeletionsDeleted) {
          logInfo("retention.cleanup_completed", result);
        }
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: job.data.projectId },
      });

      if (!project) {
        return;
      }

      if (!project.enabled) {
        return;
      }

      const result = await pingService(project);
      recordCheck(project.id, result.status, result.responseTime);
      logInfo("monitor.check_completed", {
        projectId: project.id,
        status: result.status,
        responseTimeMs: result.responseTime,
        ...(result.ssl
          ? {
              sslValid: result.ssl.valid,
              sslDaysRemaining: result.ssl.daysRemaining,
            }
          : {}),
      });
    },
    {
      connection: redis,
      concurrency: 10,
      drainDelay: 5_000,
      stalledInterval: 120_000,
    },
  );

  pingWorker.on("failed", (job, err) => {
    logError("ping.job_failed", err, { jobId: String(job?.id ?? "unknown") });
  });

  pingWorker.on("error", (err) => {
    logError("ping.worker_error", err);
  });

  await pingWorker.waitUntilReady();
  const publishHeartbeat = () => {
    if (pingWorker.isRunning()) {
      void redis.set(HEARTBEAT_KEY, "ready", "EX", 60).catch((error) => {
        logError("ping.worker_health_update_failed", error);
      });
    }
  };
  publishHeartbeat();
  const heartbeat = setInterval(publishHeartbeat, 25_000);
  heartbeat.unref?.();

  setTimeout(() => {
    void cleanupRetainedData()
      .then((result) => {
        if (result.historyDeleted || result.alertsDeleted || result.accountDeletionsDeleted) {
          logInfo("retention.startup_cleanup_completed", result);
        }
      })
      .catch((error) => logError("retention.startup_cleanup_failed", error));
  }, 5_000).unref?.();


  return {
    close: async () => {
      clearInterval(heartbeat);
      await pingWorker.close();
    },
  };
}
