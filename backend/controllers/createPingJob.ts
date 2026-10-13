import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { createJobSchema } from "../validators/createJob";
import { assertPublicMonitorUrl } from "../services/urlSafety";
import { syncProjectScheduler } from "../services/projectScheduler";
import { MAX_MONITORS_PER_USER } from "../config/limits";
import { logError } from "../logger";

export default async function createPingJob(c: AuthContext) {
  try {
    const body = await c.req.json();
    const result = createJobSchema.safeParse(body);

    if (!result.success) {
      return c.json({
        success: false,
        errors: result.error.flatten().fieldErrors,
      },
        400
      );
    }

    const { name, url, intervalSeconds } = result.data;
    const userId = c.get("userId");

    try {
      await assertPublicMonitorUrl(url);
    } catch (error) {
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : "Monitor URL is not allowed.",
      }, 400);
    }

    const creation = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

      const existingProject = await tx.project.findFirst({ where: { userId, url } });
      if (existingProject) return { kind: "duplicate" as const };

      const projectCount = await tx.project.count({ where: { userId } });
      if (projectCount >= MAX_MONITORS_PER_USER) return { kind: "limit" as const };

      const createdProject = await tx.project.create({
        data: { name, url, intervalSeconds, userId },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const alert = await tx.emailAlert.create({
        data: {
          projectId: createdProject.id,
          incidentNumber: 0,
          event: "CREATED",
          recipient: user.email,
          projectName: createdProject.name,
          projectUrl: createdProject.url,
        },
        select: { id: true },
      });
      return { kind: "created" as const, project: createdProject, alertId: alert.id };
    });

    if (creation.kind === "duplicate") {
      return c.json({ success: false, message: "This URL has already been added." }, 409);
    }
    if (creation.kind === "limit") {
      return c.json({
        success: false,
        message: `You can have up to ${MAX_MONITORS_PER_USER} monitors on your account.`,
        limit: MAX_MONITORS_PER_USER,
      }, 409);
    }

    const project = creation.project;

    if (creation.alertId) {
      try {
        const { emailQueue } = await import("../queues/emailQueue");
        await emailQueue.add(
          "send-email-alert",
          { alertId: creation.alertId },
          {
            jobId: creation.alertId,
            attempts: 5,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: { count: 20, age: 86400 },
            removeOnFail: true,
          }
        );
      } catch (err) {
        logError("email.enqueue_failed", err, { alertId: creation.alertId });
      }
    }

    let scheduleSynced = true;
    try {
      await syncProjectScheduler(project);
    } catch (error) {
      scheduleSynced = false;
      logError("monitor.schedule_sync_failed", error, { projectId: project.id });
    }

    return c.json({
      success: true,
      message: scheduleSynced
        ? "Project created successfully."
        : "Project created; its monitoring schedule will be retried automatically.",
      scheduleSynced,
      data: project,
    }, 201
    );
  }
  catch (error) {
    logError("monitor.create_failed", error);

    return c.json({
      success: false,
      message: "Internal Server Error",
    }, 500
    );
  }
}
