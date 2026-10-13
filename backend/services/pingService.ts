import { AlertEvent, type Project } from "@prisma/client";
import { prisma } from "../config/db";
import { transitionMonitorState } from "./monitorState";
import { requestMonitorCheck, type SslCertificateInfo } from "./httpCheck";
import { resolvePublicMonitorUrl } from "./urlSafety";
import { logError } from "../logger";

export type PingResult = {
  success: boolean;
  status: number;
  responseTime: number;
  checkedAt: Date;
  consecutiveFailures: number;
  ssl?: SslCertificateInfo;
};

export default async function pingService(project: Project): Promise<PingResult> {
  const checkedAt = new Date();
  const startedAt = performance.now();
  let status = 0;
  let success = false;
  let ssl: SslCertificateInfo | undefined;

  try {
    const target = await resolvePublicMonitorUrl(project.url);
    const check = await requestMonitorCheck(target);
    status = check.status;
    ssl = check.ssl;
    success = status >= 200 && status < 300;
  } catch (error) {
    logError("monitor.check_request_failed", error, { projectId: project.id });
  }

  const responseTime = Math.max(0, Math.round(performance.now() - startedAt));

  const result = await prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await tx.project.findUnique({
        where: { id: project.id },
      });

      if (!current) return null;

      const transition = transitionMonitorState(current, success);
      const openedIncident = transition.alertEvent === "DOWN";
      const recoveredIncident = transition.alertEvent === "RECOVERED";

      const update = await tx.project.updateMany({
        where: {
          id: current.id,
          failureCount: current.failureCount,
          incidentNumber: current.incidentNumber,
          isDown: current.isDown,
        },
        data: {
          lastStatus: status,
          lastCheckedAt: checkedAt,
          failureCount: transition.failureCount,
          incidentNumber: transition.incidentNumber,
          isDown: transition.isDown,
        },
      });

      if (update.count === 0) continue;

      await tx.pingHistory.create({
        data: {
          projectId: current.id,
          status,
          responseTime,
          checkedAt,
        },
      });

      if (openedIncident || recoveredIncident) {
        const user = await tx.user.findUnique({
          where: { id: current.userId },
          select: { email: true },
        });

        if (user?.email) {
          const alert = await tx.emailAlert.create({
            data: {
              projectId: current.id,
              incidentNumber: transition.incidentNumber,
              event: openedIncident ? AlertEvent.DOWN : AlertEvent.RECOVERED,
              recipient: user.email,
              projectName: current.name,
              projectUrl: current.url,
              status,
              responseTime,
            },
            select: { id: true },
          });
          return { consecutiveFailures: transition.failureCount, alertId: alert.id };
        }
      }

      return { consecutiveFailures: transition.failureCount, alertId: null };
    }

    throw new Error(`Could not update monitoring state for project ${project.id}`);
  }, { timeout: 15_000, maxWait: 10_000 });

  if (result?.alertId) {
    try {
      const { emailQueue } = await import("../queues/emailQueue");
      await emailQueue.add(
        "send-email-alert",
        { alertId: result.alertId },
        {
          jobId: result.alertId,
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: { count: 20, age: 86400 },
          removeOnFail: true,
        },
      );
    } catch (error) {
      logError("email.enqueue_failed", error, { alertId: result.alertId });
    }
  }

  return {
    success,
    status,
    responseTime,
    checkedAt,
    consecutiveFailures: result?.consecutiveFailures ?? 0,
    ssl,
  };
}
