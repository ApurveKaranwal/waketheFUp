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
import { logError } from "./logger";

const defaultOrigins = "http://localhost:3000,http://127.0.0.1:3000";

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  const cleanOrigin = origin.trim().replace(/\/+$/, "").toLowerCase();

  // Allow custom domain and preview branches automatically
  try {
    const url = new URL(cleanOrigin);
    if (
      url.hostname === "wtf.apurve.xyz" ||
      url.hostname.endsWith(".apurve.xyz") ||
      url.hostname.endsWith(".vercel.app") ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return true;
    }
  } catch {}

  const configured = (process.env.CORS_ORIGINS || defaultOrigins)
    .split(",")
    .map((v) => v.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "").toLowerCase())
    .filter(Boolean);
  return configured.includes(cleanOrigin);
}

const app = new Hono();

app.use("/*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
app.use("/*", bodyLimit({ maxSize: 16 * 1024 }));
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return (process.env.CORS_ORIGINS || defaultOrigins).split(",")[0].trim();
      return isOriginAllowed(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    maxAge: 86400,
  })
);

app.onError((err, c) => {
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
