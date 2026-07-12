import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function getPingJob(c: Context) {
  try {
    const userId = "your dummy user id";
    const projectId = c.req.param("id");
    const project = await prisma.findFirst({
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

    return c.json({
      success: true,
      data: project,
    },
      200
    );
  }
  catch (err) {
    console.error(err);

    return c.json({
      success: false,
      message: "Internal server error",
    }, 500
    );
  }
}