import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { logError } from "../logger";

export default async function getPingJob(c: AuthContext) {
  try {
    const userId = c.get("userId");
    const projectId = c.req.param("id");
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        history: {
          orderBy: {
            checkedAt: "desc",
          },
          take: 20,
        },
      },
    });

    if (!project) {
      return c.json(
        {
          success: false,
          message: "Project not found.",
        },
        404
      );
    }

    const history = project.history ?? [];
    const totalChecks = history.length;
    const successfulChecks = history.filter(
      (h) => h.status >= 200 && h.status < 300
    ).length;
    const uptimePercentage =
      totalChecks > 0
        ? Math.round((successfulChecks / totalChecks) * 1000) / 10
        : 100;
    const avgResponseTime =
      totalChecks > 0
        ? Math.round(
            history.reduce((sum, h) => sum + (Number(h.responseTime) || 0), 0) / totalChecks
          )
        : null;

    return c.json(
      {
        success: true,
        data: {
          ...project,
          uptimePercentage,
          avgResponseTime,
        },
      },
      200
    );
  }
  catch (err) {
    logError("monitor.read_failed", err);

    return c.json({
      success: false,
      message: "Internal server error",
    }, 500
    );
  }
}
