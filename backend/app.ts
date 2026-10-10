import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { requireUser } from "./auth";
import { userRateLimit } from "./middleware/userRateLimit";
import { getReadinessReport } from "./services/readiness";
import { metricsMiddleware } from "./middleware/metrics";
import pingRouter from "./routes/ping";
import deleteAccount from "./controllers/deleteAccount";

const app = new Hono();

app.use("/*", secureHeaders());
app.use("/*", bodyLimit({ maxSize: 16 * 1024 }));
app.use(
  "/*",
  cors({
    origin: (origin) => {
      const defaultOrigins = "http://localhost:3000,http://127.0.0.1:3000";
      const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins)
        .split(",")
        .map((value) => value.trim());
      if (!origin) return allowedOrigins[0];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.onError((err, c) => {
  const { logError } = require("./logger");
  logError("api.unhandled_error", err);
  return c.json({ success: false, message: err.message || "Internal server error" }, 500);
});

app.use("/*", metricsMiddleware());


app.get("/", (c) => c.json({ status: "ok", service: "WTFup API" }));
app.get("/health/live", (c) => c.json({ status: "ok" }));
app.get("/health/ready", async (c) => {
  const report = await getReadinessReport();
  return c.json(
    { status: report.ready ? "ready" : "not_ready", checks: report.checks },
    report.ready ? 200 : 503,
  );
});
app.get("/metrics", async (c) => {
  const { registry, refreshMonitorGauges } = await import("./services/metrics");
  await refreshMonitorGauges().catch(() => undefined);
  c.header("Content-Type", registry.contentType);
  return c.text(await registry.metrics());
});
app.use("/ping/*", requireUser);
app.use("/ping", requireUser);
app.use("/ping/*", userRateLimit);
app.use("/ping", userRateLimit);
app.route("/ping", pingRouter);
app.use("/account", requireUser);
app.use("/account", userRateLimit);
app.delete("/account", deleteAccount);

export default app;
