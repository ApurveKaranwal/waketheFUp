import type { Context } from "hono";
import { prisma } from "../config/db";
import { updatePingJobSchema } from "../validators/updatePingJob";

export default async function updatePingJob(c: Context) {
  try {
    const userId = "cmrf8wtxs0000x3xysq2iro6x";
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

    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: parsed.data,
    });

    return c.json({
      success: true,
      message: "Project updated successfully.",
      data: updatedProject,
    },
      200
    );
  }
  catch (err) {
    console.error(err);

    return c.json({
      success: false,
      message: "Internal Server Error",
    },
      500
    );
  }
}