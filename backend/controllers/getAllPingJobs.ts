import type { AuthContext } from "../types";
import { prisma } from "../config/db";
import { logError } from "../logger";

export default async function getAllPingJobs(c: AuthContext) {
  try {
    const userId = c.get("userId");

    const projects = await prisma.project.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
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

    const enriched = projects.map((p) => {
      const history = p.history ?? [];
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

      return {
        id: p.id,
        name: p.name,
        url: p.url,
        enabled: p.enabled,
        intervalSeconds: p.intervalSeconds,
        lastStatus: p.lastStatus,
        lastCheckedAt: p.lastCheckedAt,
        failureCount: p.failureCount,
        createdAt: p.createdAt,
        uptimePercentage,
        avgResponseTime,
        history,
      };
    });
    
    return c.json(
      {
        success: true,
        count: enriched.length,
        data: enriched,
      },
      200
    );
  }
  catch (err) {
    logError("monitor.list_failed", err);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
}
