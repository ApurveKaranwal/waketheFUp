import { Worker } from "bullmq";
import { redis } from "../config/redis";

export const pingWorker = new Worker(
  "pingQueue",
  async (job) => {
    console.log("Received job:", job.name);
    console.log("Project ID:", job.data.projectId);
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