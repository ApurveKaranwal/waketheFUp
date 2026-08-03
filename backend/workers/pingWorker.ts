import { Worker } from "bullmq";
import { redis } from "../config/redis";
import pingService from "../services/pingService";
import { prisma } from "../config/db";

export const pingWorker = new Worker(
  "pingQueue",
  async (job) => {
    console.log("Received job:", job.name);
    console.log("Project ID:", job.data.projectId);

    const project = await prisma.project.findUnique({
      where: {
        id: job.data.projectId,
      },
      
    });

    if (!project) {
      console.log(`Project ${job.data.projectId} not found`);
      return;
    }

    if (!project.enabled){
      console.log(`Project ${project.id} is disabled`);
      return;
    }

    await pingService(project);
    console.log(`Successfully monitored ${project.name}`);
  },
  {
    connection: redis,
  }
);

pingWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`);
  console.error(err);
});

pingWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

pingWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed.`);
});