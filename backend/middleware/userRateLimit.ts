import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../types";
import { logError } from "../logger";
import { recordRateLimit } from "../services/metrics";

const WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  GET: 120,
  POST: 10,
  PATCH: 30,
  DELETE: 10,
};

const incrementWindowScript = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  return { count, redis.call('PTTL', KEYS[1]) }
`;

type IncrementWindow = (key: string, windowMs: number) => Promise<[number, number]>;

const incrementWindow: IncrementWindow = async (key, windowMs) => (
  await (await import("../config/redis")).redis.eval(
    incrementWindowScript,
    1,
    key,
    windowMs,
  )
) as [number, number];

export function createUserRateLimit(
  increment: IncrementWindow = incrementWindow,
  limits: Record<string, number> = RATE_LIMITS,
  windowMs = WINDOW_MS,
) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const limit = limits[c.req.method];
    if (!limit) return next();

    const bucket = `${c.get("userId")}:${c.req.method.toLowerCase()}`;
    let count: number;
    let ttl: number;
    try {
      [count, ttl] = await increment(`wtfup:rate-limit:${bucket}`, windowMs);
    } catch (error) {
      logError("api.rate_limiter_unavailable", error);
      return c.json(
        { success: false, message: "Request protection is temporarily unavailable." },
        503,
      );
    }

    const remaining = Math.max(0, limit - Number(count));
    const resetSeconds = Math.max(1, Math.ceil(Number(ttl) / 1_000));
    c.header("RateLimit-Limit", String(limit));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(resetSeconds));

    if (Number(count) > limit) {
      recordRateLimit(c.req.method);
      c.header("Retry-After", String(resetSeconds));
      return c.json(
        { success: false, message: "Too many requests. Please try again shortly." },
        429,
      );
    }

    await next();
  });
}

export const userRateLimit = createUserRateLimit();
