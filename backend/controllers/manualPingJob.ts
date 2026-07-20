import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function manualPingJob(c: Context) {
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

    const start = Date.now();
    const response = await fetch(project.url);
    const end = Date.now();
    const responseTime = end - start;
//we can also use performance.now() for much better accuracy
    return c.json({
      status: response.status,
      responseTime,
    });
  }
}