import { describe, expect, it } from "bun:test";
import { getReadinessReport, isBullMqRedisVersionSupported } from "./readiness";

const configuredEnvironment = {
  NODE_ENV: "production",
  CLERK_SECRET_KEY: "configured",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "user",
  SMTP_PASS: "pass",
  EMAIL_FROM: "alerts@example.com",
  CORS_ORIGINS: "https://app.example.com",
};

const healthyDependencies = {
  database: async () => 1,
  redis: async () => "PONG",
  pingWorker: async () => "ready",
  emailWorker: async () => "ready",
  smtp: async () => "ok",
  environment: configuredEnvironment,
};

describe("getReadinessReport", () => {
  it("requires a Redis version supported by BullMQ", () => {
    expect(isBullMqRedisVersionSupported("redis_version:3.0.504\r\n" )).toBe(false);
    expect(isBullMqRedisVersionSupported("redis_version:4.0.14\r\n")).toBe(false);
    expect(isBullMqRedisVersionSupported("redis_version:5.0.0\r\n")).toBe(true);
    expect(isBullMqRedisVersionSupported("redis_version:7.2.4\r\n")).toBe(true);
    expect(isBullMqRedisVersionSupported("role:master\r\n")).toBe(false);
  });

  it("reports ready only when dependencies and required launch configuration are present", async () => {
    const ready = await getReadinessReport({
      database: async () => 1,
      redis: async () => "PONG",
      pingWorker: async () => "ready",
      emailWorker: async () => "ready",
      smtp: async () => "ok",
      environment: configuredEnvironment,
    });
    const unavailable = await getReadinessReport({
      database: async () => { throw new Error("database unavailable"); },
      redis: async () => "PONG",
      pingWorker: async () => "ready",
      emailWorker: async () => "ready",
      smtp: async () => "ok",
      environment: configuredEnvironment,
    });

    expect(ready.ready).toBe(true);
    expect(ready.checks.database).toBe("ok");
    expect(unavailable.ready).toBe(false);
    expect(unavailable.checks.database).toBe("unavailable");
  });

  it("does not expose a production-ready state with missing email or browser origin configuration", async () => {
    const report = await getReadinessReport({
      database: async () => 1,
      redis: async () => "PONG",
      pingWorker: async () => "ready",
      emailWorker: async () => "ready",
      smtp: async () => "ok",
      environment: { NODE_ENV: "production", CLERK_SECRET_KEY: "configured" },
    });

    expect(report.ready).toBe(false);
    expect(report.checks.email).toBe("missing");
    expect(report.checks.browserOrigins).toBe("missing");
  });

  it("rejects insecure, malformed, wildcard, and local production browser origins", async () => {
    for (const origins of ["http://app.example.com", "*", "https://app.example.com,", "https://localhost"]) {
      const report = await getReadinessReport({ ...healthyDependencies, environment: { ...configuredEnvironment, CORS_ORIGINS: origins } });
      expect(report.checks.browserOrigins).toBe("missing");
      expect(report.ready).toBe(false);
    }
  });

  it("requires healthy workers and a verified SMTP connection", async () => {
    const report = await getReadinessReport({
      ...healthyDependencies,
      emailWorker: async () => { throw new Error("worker unavailable"); },
    });
    expect(report.checks.emailWorker).toBe("unavailable");
    expect(report.ready).toBe(false);
  });

  it("rejects out-of-range SMTP ports", async () => {
    const report = await getReadinessReport({
      ...healthyDependencies,
      environment: { ...configuredEnvironment, SMTP_PORT: "70000" },
    });
    expect(report.checks.smtp).toBe("unconfigured");
    expect(report.checks.email).toBe("missing");
    expect(report.ready).toBe(false);
  });

  it("returns a bounded not-ready result when a dependency probe hangs", async () => {
    const report = await getReadinessReport({
      ...healthyDependencies,
      database: () => new Promise(() => undefined),
    }, 5);
    expect(report.ready).toBe(false);
    expect(report.checks.database).toBe("unavailable");
  });
});
