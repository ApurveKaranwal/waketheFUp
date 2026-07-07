import type { Context } from "hono";
import { prisma } from "../config/db";
import { createJobSchema } from "../validators/createJob";

export default async function createPingJob(c: Context) {
  try {
    const body = await c.req.json();
    const result = createJobSchema.safeParse(body);

    if (!result.success) {
      return c.json({
        success: false,
        errors: result.error.flatten().fieldErrors,
      },
        400
      );
    }

    const { name, url, intervalSeconds } = result.data;
    const userId = "temp-user-id" //using temp user id as clerk is not setup till yet.

    const existingProject = await prisma.project.findFirst({
      where: {
        userId,
        url,
      },
    });

    if (existingProject) {
      return c.json({
        success: false,
        message: "This URL has already been added."
      }, 409
      );
    }
    const project = await prisma.project.create({
      data: {
        name,
        url,
        intervalSeconds,
        userId,
      },
    });

    return c.json({
      success: true,
      message: "Project created successfully.",
      data: project,
    }, 201
    );
  }
  catch (error) {
    console.error(error);

    return c.json({
      success: false,
      message: "Internal Server Error",
    }, 500
    );
  }
}