import { Counter, Gauge, Histogram, Registry } from "prom-client";

export const registry = new Registry();

export const checksTotal = new Counter({
  name: "wtfup_checks_total",
  help: "Total number of monitor checks performed",
  labelNames: ["status", "project_id"],
  registers: [registry],
});

export const checkDuration = new Histogram({
  name: "wtfup_check_duration_seconds",
  help: "Duration of monitor checks in seconds",
  labelNames: ["project_id"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 20],
  registers: [registry],
});

export const monitorsTotal = new Gauge({
  name: "wtfup_monitors_total",
  help: "Total number of monitors",
  labelNames: ["enabled"],
  registers: [registry],
});

export const rateLimitHits = new Counter({
  name: "wtfup_rate_limit_hits_total",
  help: "Total number of rate-limited requests",
  labelNames: ["method"],
  registers: [registry],
});

export const alertsTotal = new Counter({
  name: "wtfup_alerts_total",
  help: "Total number of alert events generated",
  labelNames: ["event", "project_id"],
  registers: [registry],
});

export const apiRequests = new Counter({
  name: "wtfup_api_requests_total",
  help: "Total number of API requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

export function recordCheck(projectId: string, status: number, durationMs: number): void {
  const statusLabel = status >= 200 && status < 400 ? "up" : status === 0 ? "timeout" : "down";
  checksTotal.inc({ status: statusLabel, project_id: projectId });
  checkDuration.observe({ project_id: projectId }, durationMs / 1000);
}

export function recordRateLimit(method: string): void {
  rateLimitHits.inc({ method });
}

export function recordAlert(event: string, projectId: string): void {
  alertsTotal.inc({ event, project_id: projectId });
}

export function recordApiRequest(method: string, path: string, status: number): void {
  apiRequests.inc({ method, path, status });
}

export function setMonitorsTotal(enabled: number, disabled: number): void {
  monitorsTotal.set({ enabled: "true" }, enabled);
  monitorsTotal.set({ enabled: "false" }, disabled);
}

export async function refreshMonitorGauges(): Promise<void> {
  const { prisma } = await import("../config/db");
  const [enabled, disabled] = await Promise.all([
    prisma.project.count({ where: { enabled: true } }),
    prisma.project.count({ where: { enabled: false } }),
  ]);
  setMonitorsTotal(enabled, disabled);
}