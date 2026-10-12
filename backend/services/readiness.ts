import { prisma } from "../config/db";

type Environment = Record<string, string | undefined>;
type Probe = () => Promise<unknown>;
const DEFAULT_PROBE_TIMEOUT_MS = 3_000;

async function runProbe(probe: Probe, timeoutMs: number): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      probe(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Readiness probe timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export type ReadinessDependencies = {
  database: Probe;
  redis: Probe;
  pingWorker: Probe;
  emailWorker: Probe;
  smtp: Probe;
  environment: Environment;
};

export type ReadinessReport = {
  ready: boolean;
  checks: {
    database: "ok" | "unavailable";
    redis: "ok" | "unavailable";
    pingWorker: "ready" | "unavailable";
    emailWorker: "ready" | "unavailable";
    smtp: "ready" | "unavailable" | "unconfigured";
    authentication: "configured" | "missing";
    email: "configured" | "missing";
    browserOrigins: "configured" | "missing";
  };
};

export function isBullMqRedisVersionSupported(serverInfo: string): boolean {
  const version = serverInfo.match(/^redis_version:(\d+)\.(\d+)(?:\.|$)/m);
  if (!version) return false;
  const major = Number(version[1]);
  return major >= 5;
}

function hasValidProductionOrigins(value: string | undefined): boolean {
  if (!value) return false;
  const origins = value.split(",").map((origin) => origin.trim().replace(/^["']|["']$/g, ""));
  if (origins.some((origin) => !origin || origin === "*")) return false;
  return origins.every((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "https:" && parsed.origin === origin &&
        parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "[::1]";
    } catch {
      return false;
    }
  });
}

export async function getReadinessReport(
  dependencies?: ReadinessDependencies,
  probeTimeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
): Promise<ReadinessReport> {
  if (!dependencies) {
    const { redis } = await import("../config/redis");
    dependencies = {
      database: () => prisma.$queryRaw`SELECT 1`,
      redis: async () => {
        await redis.ping();
        const serverInfo = await redis.info("server");
        if (!isBullMqRedisVersionSupported(serverInfo)) {
          throw new Error("Redis 5 or later is required by BullMQ.");
        }
      },
      pingWorker: async () => {
        if (!await redis.get("wtfup:health:ping-worker")) throw new Error("Ping worker is not ready");
      },
      emailWorker: async () => {
        if (!await redis.get("wtfup:health:email-worker")) throw new Error("Email worker is not ready");
      },
      smtp: async () => {
        if (await redis.get("wtfup:health:smtp") !== "ok") throw new Error("SMTP is not ready");
      },
      environment: process.env,
    };
  }

  const [database, redisCheck, pingWorker, emailWorker, smtp] = await Promise.allSettled([
    runProbe(dependencies.database, probeTimeoutMs),
    runProbe(dependencies.redis, probeTimeoutMs),
    runProbe(dependencies.pingWorker, probeTimeoutMs),
    runProbe(dependencies.emailWorker, probeTimeoutMs),
    runProbe(dependencies.smtp, probeTimeoutMs),
  ]);
  const env = dependencies.environment;
  const smtpPort = Number(env.SMTP_PORT);
  const checks: ReadinessReport["checks"] = {
    database: database.status === "fulfilled" ? "ok" : "unavailable",
    redis: redisCheck.status === "fulfilled" ? "ok" : "unavailable",
    pingWorker: pingWorker.status === "fulfilled" ? "ready" : "unavailable",
    emailWorker: emailWorker.status === "fulfilled" ? "ready" : "unavailable",
    smtp: !env.SMTP_HOST || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535 || !env.SMTP_USER || !env.SMTP_PASS || !env.EMAIL_FROM
      ? "unconfigured"
      : smtp.status === "fulfilled" ? "ready" : "unavailable",
    authentication: env.CLERK_SECRET_KEY ? "configured" : "missing",
    email: env.SMTP_HOST && Number.isInteger(smtpPort) && smtpPort > 0 && smtpPort <= 65_535 && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM
      ? "configured"
      : "missing",
    browserOrigins: env.NODE_ENV === "production"
      ? hasValidProductionOrigins(env.CORS_ORIGINS) ? "configured" : "missing"
      : "configured",
  };

  return {
    ready: Object.values(checks).every((state) => ["ok", "ready", "configured"].includes(state)),
    checks,
  };
}
