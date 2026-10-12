import IORedis from "ioredis";
import { logError } from "../logger";

export const redis = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    enableAutoPipelining: true,
  }
);

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (error) => {
  logError("redis.connection_failed", error);
});
