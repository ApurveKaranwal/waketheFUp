import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createUserRateLimit } from "./userRateLimit";
import type { AuthEnv } from "../types";

function createApp(increment: (key: string, windowMs: number) => Promise<[number, number]>) {
  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    c.set("userId", "test-user");
    await next();
  });
  app.use("*", createUserRateLimit(increment, { GET: 1 }, 60_000));
  app.get("/", (c) => c.json({ ok: true }));
  return app;
}

describe("user rate limit middleware", () => {
  it("returns 429 and retry headers after the account limit", async () => {
    let count = 0;
    const app = createApp(async () => [++count, 30_000]);

    expect((await app.request("/")).status).toBe(200);
    const limited = await app.request("/");

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("30");
    expect(limited.headers.get("RateLimit-Limit")).toBe("1");
  });

  it("fails closed when Redis cannot enforce the limit", async () => {
    const app = createApp(async () => {
      throw new Error("redis unavailable");
    });

    expect((await app.request("/")).status).toBe(503);
  });
});
