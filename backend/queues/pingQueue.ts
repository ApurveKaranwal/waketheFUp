import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const pingQueue = new Queue("pingQueue", {
  connection: redis,
});