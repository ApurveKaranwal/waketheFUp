import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function manualPingJob(c: Context) {
  try {
    const projectId = c.req.param('id');
    const userId = "cmrf8wtxs0000x3xysq2iro6x";
    const checkedAt = new Date();

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

    const start = performance.now();
    const response = await fetch(project.url);
    const responseTime = Math.round(performance.now() - start);
//we can also use performance.now() for much better accuracy

    await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        lastStatus: response.status,
        lastCheckedAt: checkedAt,
        failureCount: 0,
      },
    });

    await prisma.pingHistory.create({
      data: {
        status: response.status,
        responseTime,
        projectId: project.id,
      },
    });

    return c.json({
      success: true,
      message: "Project checked Successfully",
      data: {
        status: response.status,
        responseTime,
        checkedAt,
      },
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