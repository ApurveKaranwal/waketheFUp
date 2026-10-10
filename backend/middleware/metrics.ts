import type { Context, MiddlewareHandler } from "hono";
import { recordApiRequest } from "../services/metrics";

export function metricsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;
    const method = c.req.method?.toLowerCase() ?? "unknown";
    const path = c.req.path ?? "/";
    const status = c.res?.status ?? 0;

    recordApiRequest(method, path, status);

    // Log slow requests (over 2 seconds)
    if (duration > 2000) {
      const { logInfo } = await import("../logger");
      logInfo("api.slow_request", {
        method,
        path,
        durationMs: duration,
        status,
      });
    }
  };
}