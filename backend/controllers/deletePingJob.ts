import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function deletePingJob(c: Context) {
  try {
    const projectId = c.req.param('id');
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

    const deletedProject = await prisma.project.delete({
      where: {
        id: project.id,
      },
    });

    return c.json({
      success: true,
      message: "Project deleted successfully.",
      data: deletedProject,
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
