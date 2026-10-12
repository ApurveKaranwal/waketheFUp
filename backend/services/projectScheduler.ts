import type { Project } from "@prisma/client";
import { prisma } from "../config/db";
import { pingQueue } from "../queues/pingQueue";
import { findStaleProjectSchedulerIds } from "./schedulerState";

export const PROJECT_SCHEDULER_PREFIX = "project-";
export const SCHEDULER_RECONCILER_ID = "project-scheduler-reconciler";
const SCHEDULER_BATCH_SIZE = 200;

export async function syncProjectScheduler(
  project: Pick<Project, "id" | "enabled" | "intervalSeconds">,
): Promise<void> {
  const schedulerId = `${PROJECT_SCHEDULER_PREFIX}${project.id}`;
  if (!project.enabled) {
    await pingQueue.removeJobScheduler(schedulerId);
    return;
  }

  await pingQueue.upsertJobScheduler(
    schedulerId,
    { every: project.intervalSeconds * 1_000 },
    {
      name: "ping-project",
      data: { projectId: project.id },
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 1_000,
        removeOnFail: 1_000,
      },
    },
  );
}

export async function reconcileProjectSchedulers(): Promise<void> {
  // Fetch existing schedulers first to avoid thundering-herd writes every 60s
  const schedulers = [];
  const pageSize = 250;
  for (let start = 0; ; start += pageSize) {
    const page = await pingQueue.getJobSchedulers(start, start + pageSize - 1, true);
    schedulers.push(...page);
    if (page.length < pageSize) break;
  }

  const existingSchedulersMap = new Map<string, number>();
  for (const s of schedulers) {
    if (s.key && s.every) {
      existingSchedulersMap.set(s.key, Number(s.every));
    }
  }

  const activeIds = new Set<string>();
  let offset = 0;

  while (true) {
    const projects = await prisma.project.findMany({
      where: { enabled: true },
      orderBy: { id: "asc" },
      skip: offset,
      take: SCHEDULER_BATCH_SIZE,
      select: { id: true, enabled: true, intervalSeconds: true },
    });
    if (projects.length === 0) break;

    const toSync: typeof projects = [];
    for (const project of projects) {
      activeIds.add(project.id);
      const schedulerKey = `${PROJECT_SCHEDULER_PREFIX}${project.id}`;
      const existingInterval = existingSchedulersMap.get(schedulerKey);
      const expectedInterval = project.intervalSeconds * 1_000;

      // Only upsert if missing or interval changed
      if (existingInterval !== expectedInterval) {
        toSync.push(project);
      }
    }

    if (toSync.length > 0) {
      for (let i = 0; i < toSync.length; i += 25) {
        await Promise.all(toSync.slice(i, i + 25).map(syncProjectScheduler));
      }
    }

    offset += projects.length;
    if (projects.length < SCHEDULER_BATCH_SIZE) break;
  }

  const staleSchedulerIds = findStaleProjectSchedulerIds(
    schedulers,
    activeIds,
    PROJECT_SCHEDULER_PREFIX,
    SCHEDULER_RECONCILER_ID,
  );
  for (const id of staleSchedulerIds) {
    await pingQueue.removeJobScheduler(id);
  }
}
