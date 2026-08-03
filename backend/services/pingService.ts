import { prisma } from "../config/db";
import { Project } from "@prisma/client";

export default async function pingService(project: Project) {
  const checkedAt = new Date();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const start = performance.now();
    const controller = new AbortController();
    timeout = setTimeout(() => {
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
        projectId: project.id,
        status: response.status,
        responseTime,
        checkedAt,
      },
    });

    return {
      success: true,
      status: response.status,
      responseTime,
      checkedAt,
    }
  }
  catch (error) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
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

    throw error;
  }
}