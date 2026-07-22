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
    
    try {
      const start = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        }, 10000);
      const response = await fetch(project.url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      const responseTime = Math.round(performance.now() - start);
      
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
    catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        console.log('Request timed out');
      } else {
      console.error(error);
      }
      
      await prisma.project.update({
        where: {
          id: project.id,
        },
        data: {
          lastCheckedAt: checkedAt,
          lastStatus: 0,
          failureCount: {
            increment: 1,
          },
        },
      });

      await prisma.pingHistory.create({
        data: {
          projectId: project.id,
          status: 0,
          responseTime: 0,
          checkedAt,
        },
      });

      return c.json({
        success: false,
        message: "website is unreachable",
      },
        503
      );
    }
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