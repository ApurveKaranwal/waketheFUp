import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { prisma } from "../config/db";
import { requestAccountDeletion } from "../services/accountDeletion";
import type { AuthEnv } from "../types";

const shouldRunIntegration = process.env.RUN_DB_INTEGRATION === "true";
const integrationDescribe = shouldRunIntegration ? describe : describe.skip;

integrationDescribe("monitor account isolation (PostgreSQL integration)", () => {
  const suffix = randomUUID();
  const ownerClerkId = `owner-${suffix}`;
  const otherClerkId = `other-${suffix}`;
  let ownerId = "";
  let otherId = "";
  let monitorId = "";
  let ownerMonitorId = "";

  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    c.set("userId", c.req.header("x-test-user") ?? "");
    await next();
  });
  beforeAll(async () => {
    const { default: pingRouter } = await import("../routes/ping");
    app.route("/ping", pingRouter);

    const owner = await prisma.user.create({
      data: { clerkId: ownerClerkId, email: `owner-${suffix}@example.test`, name: "Integration owner" },
    });
    const other = await prisma.user.create({
      data: { clerkId: otherClerkId, email: `other-${suffix}@example.test`, name: "Integration other" },
    });
    ownerId = owner.id;
    otherId = other.id;

    const [foreignMonitor, ownerMonitor] = await Promise.all([
      prisma.project.create({
        data: { name: "Private monitor", url: `https://${suffix}.example.test`, intervalSeconds: 60, userId: otherId },
      }),
      prisma.project.create({
        data: { name: "Owner monitor", url: `https://owner-${suffix}.example.test`, intervalSeconds: 60, userId: ownerId },
      }),
    ]);
    monitorId = foreignMonitor.id;
    ownerMonitorId = ownerMonitor.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.accountDeletion.deleteMany({ where: { clerkId: ownerClerkId } });
  }, 30_000);

  it("hides another account's monitor and rejects its update, toggle, and deletion", async () => {
    const headers = { "x-test-user": ownerId, "Content-Type": "application/json" };
    const read = await app.request(`/ping/${monitorId}`, { headers });
    const update = await app.request(`/ping/${monitorId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Stolen monitor" }),
    });
    const toggle = await app.request(`/ping/${monitorId}/toggle`, { method: "PATCH", headers });
    const remove = await app.request(`/ping/${monitorId}`, { method: "DELETE", headers });
    const list = await app.request("/ping", { headers });
    const listed = await list.json() as { data: Array<{ id: string }> };

    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(toggle.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(list.status).toBe(200);
    expect(listed.data.map((project) => project.id)).toEqual([ownerMonitorId]);

    const unchanged = await prisma.project.findUniqueOrThrow({ where: { id: monitorId } });
    expect(unchanged.name).toBe("Private monitor");
    expect(unchanged.enabled).toBe(true);
  }, 30_000);

  it("deletes a user's monitors, history, and alerts while retaining an identity tombstone", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    await prisma.pingHistory.create({
      data: { projectId: ownerMonitorId, status: 200, responseTime: 25 },
    });
    await prisma.emailAlert.create({
      data: {
        projectId: ownerMonitorId,
        event: "CREATED",
        incidentNumber: 0,
        recipient: user.email,
        projectName: "Owner monitor",
        projectUrl: `https://owner-${suffix}.example.test`,
      },
    });

    await requestAccountDeletion(ownerId, ownerClerkId);

    expect(await prisma.user.findUnique({ where: { id: ownerId } })).toBeNull();
    expect(await prisma.project.findUnique({ where: { id: ownerMonitorId } })).toBeNull();
    expect(await prisma.pingHistory.count({ where: { projectId: ownerMonitorId } })).toBe(0);
    expect(await prisma.emailAlert.count({ where: { projectId: ownerMonitorId } })).toBe(0);
    expect(await prisma.accountDeletion.findUnique({ where: { clerkId: ownerClerkId } })).not.toBeNull();
  }, 30_000);
});
