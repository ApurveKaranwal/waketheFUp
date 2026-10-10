import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { updatePingJobSchema } from "../validators/updatePingJob";
import { assertPublicMonitorUrl } from "../services/urlSafety";
import { syncProjectScheduler } from "../services/projectScheduler";
import { logError } from "../logger";

export default async function updatePingJob(c: AuthContext) {
  try {
    const userId = c.get("userId");
    const projectId = c.req.param("id");
    const body = await c.req.json();
    const parsed = updatePingJobSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({
        success: false,
        errors: parsed.error.flatten(),
      },
        400
      )
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return c.json({
        success: false,
        message: "Project not found.",
      },
        404
      );
    }

    if (parsed.data.url) {
      try {
        await assertPublicMonitorUrl(parsed.data.url);
      } catch (error) {
        return c.json({
          success: false,
          message: error instanceof Error ? error.message : "Monitor URL is not allowed.",
        }, 400);
      }

    }

    const updateResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const currentProject = await tx.project.findFirst({
        where: { id: projectId, userId },
        select: { id: true },
      });
      if (!currentProject) return { kind: "not-found" as const };

      if (parsed.data.url) {
        const duplicate = await tx.project.findFirst({
          where: { userId, url: parsed.data.url, id: { not: projectId } },
          select: { id: true },
        });
        if (duplicate) return { kind: "duplicate" as const };
      }

      const updatedProject = await tx.project.update({
        where: { id: projectId, userId },
        data: parsed.data,
      });
      return { kind: "updated" as const, project: updatedProject };
    });

    if (updateResult.kind === "not-found") {
      return c.json({ success: false, message: "Project not found." }, 404);
    }
    if (updateResult.kind === "duplicate") {
      return c.json({ success: false, message: "This URL is already used by another monitor." }, 409);
    }
    const updatedProject = updateResult.project;

    let scheduleSynced = true;
    try {
      await syncProjectScheduler(updatedProject);
    } catch (error) {
      scheduleSynced = false;
      logError("monitor.update_schedule_sync_failed", error, { projectId: updatedProject.id });
    }

    return c.json({
      success: true,
      message: scheduleSynced
        ? "Project updated successfully."
        : "Project updated; its monitoring schedule will be retried automatically.",
      scheduleSynced,
      data: updatedProject,
    },
      200
    );
  }
  catch (err) {
    logError("monitor.update_failed", err);

    return c.json({
      success: false,
      message: "Internal Server Error",
    },
      500
    );
  }
}
