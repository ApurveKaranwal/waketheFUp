import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { syncProjectScheduler } from "../services/projectScheduler";
import { logError } from "../logger";

export default async function togglePingJob(c: AuthContext) {
  try {
    const projectId = c.req.param("id");
    const userId = c.get("userId");

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return c.json({
        success: false,
        message: "Project not found",
      },
        404
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id, userId },
      data: {
        enabled: !project.enabled,
      },
    });

    let scheduleSynced = true;
    try {
      await syncProjectScheduler(updatedProject);
    } catch (error) {
      scheduleSynced = false;
      logError("monitor.toggle_schedule_sync_failed", error, { projectId: updatedProject.id });
    }

    return c.json({
      success: true,
      message: scheduleSynced
        ? `Monitoring ${updatedProject.enabled ? "enabled" : "disabled"} successfully.`
        : "Monitoring state saved; its queue schedule will be reconciled automatically.",
      scheduleSynced,
      data: updatedProject,
    },
      200
    );
  }
  catch (err) {
    logError("monitor.toggle_failed", err);
    return c.json({
      success: false,
      message: "Internal server error."
    },
    500
    )
  }
}
