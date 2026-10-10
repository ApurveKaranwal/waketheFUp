import { prisma, connectDB } from "./config/db";
import { redis } from "./config/redis";
import { pingQueue } from "./queues/pingQueue";
import type { startEmailAlertWorker } from "./workers/emailWorker";
import type { startPingWorker } from "./workers/pingWorker";
import { logError, logInfo } from "./logger";

type RuntimeOptions = {
  api: boolean;
  workers: boolean;
};

export async function startBackend(options: RuntimeOptions): Promise<void> {
  let pingWorker: Awaited<ReturnType<typeof startPingWorker>> | undefined;
  let emailWorker: Awaited<ReturnType<typeof startEmailAlertWorker>> | undefined;
  let emailQueue: typeof import("./queues/emailQueue").emailQueue | undefined;
  let server: ReturnType<typeof Bun.serve> | undefined;

  try {
    await connectDB();

    if (options.workers) {
      const [pingWorkerModule, emailWorkerModule, emailQueueModule] = await Promise.all([
        import("./workers/pingWorker"),
        import("./workers/emailWorker"),
        import("./queues/emailQueue"),
      ]);
      emailQueue = emailQueueModule.emailQueue;
      pingWorker = await pingWorkerModule.startPingWorker();
      emailWorker = await emailWorkerModule.startEmailAlertWorker();
    }

    if (options.api) {
      const { default: app } = await import("./app");
      server = Bun.serve({
        fetch: app.fetch,
        port: Number(process.env.PORT) || 4_000,
      });
      logInfo("api.listening", { port: server.port ?? "unknown" });
    }
  } catch (error) {
    await server?.stop(true);
    await Promise.allSettled([
      ...(pingWorker ? [pingWorker.close()] : []),
      ...(emailWorker ? [emailWorker.close()] : []),
      pingQueue.close(),
      ...(emailQueue ? [emailQueue.close()] : []),
    ]);
    redis.disconnect();
    await prisma.$disconnect().catch(() => undefined);
    throw error;
  }

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = () => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      logInfo("runtime.shutting_down");
      await server?.stop(true);
      await Promise.allSettled([
        ...(pingWorker ? [pingWorker.close()] : []),
        ...(emailWorker ? [emailWorker.close()] : []),
        pingQueue.close(),
        ...(emailQueue ? [emailQueue.close()] : []),
      ]);
      await Promise.allSettled([redis.quit(), prisma.$disconnect()]);
    })();
    return shutdownPromise;
  };

  const handleShutdown = () => {
    void shutdown().catch((error) => {
      logError("runtime.shutdown_failed", error);
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", handleShutdown);
  process.once("SIGTERM", handleShutdown);
}
