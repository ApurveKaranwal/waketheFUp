import type { Context } from "hono";
import { prisma } from "../config/db";

export default async function getAllPingJobs(c: Context) {
  try {
    const userId = "cmrf8wtxs0000x3xysq2iro6x";

    const projects = await prisma.project.findMany({
      where: {
        userId,
      }, orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        url: true,
        enabled: true,
        intervalSeconds: true,
        //if frontend needs any more info, we can add them here
    );
  } catch (err) {
    console.error(err);

    return c.json({
      success: false,
      message: "Interval Server Error",
    }, 500
    );
  }
}