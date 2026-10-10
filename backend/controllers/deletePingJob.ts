import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { syncProjectScheduler } from "../services/projectScheduler";
import { logError } from "../logger";

export default async function deletePingJob(c: AuthContext) {
  try {
    const projectId = c.req.param('id');
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

    const deletedProject = await prisma.project.delete({
      where: {
        id: project.id,
      },
    });

    let scheduleSynced = true;
    try {
      await syncProjectScheduler({ ...project, enabled: false });
    } catch (error) {
      scheduleSynced = false;
      logError("monitor.delete_schedule_sync_failed", error, { projectId: project.id });
    }

    return c.json({
      success: true,
      message: "Project deleted successfully.",
      scheduleSynced,
      data: deletedProject,
    },
      200
    );
  }
  catch (err) {
    logError("monitor.delete_failed", err);
    return c.json({
      success: false,
      message: "Internal server error."
    },
      500
    );
  }
}
