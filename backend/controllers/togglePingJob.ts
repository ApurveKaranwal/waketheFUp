import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function togglePingJob(c: Context) {
  try {
    const projectId = c.req.param("id");
    const userId = "cmrf8wtxs0000x3xysq2iro6x";

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
      where: {
        id: project.id,
      },
      data: {
        enabled: !project.enabled,
      },
    });

    return c.json({
      success: true,
      message: `Monitoring ${updatedProject.enabled ? "enabled" : "disabled"
        } successfully.`,
      data: updatedProject,
    },
      200
    );
  }
  catch (err) {
    console.error(err);
    return c.json({
      success: false,
      message: "Internal server error."
    },
    500
    )
  }
}