type SchedulerIdentifier = {
  id?: string | null;
  key: string;
};

export function findStaleProjectSchedulerIds(
  schedulers: SchedulerIdentifier[],
  activeProjectIds: ReadonlySet<string>,
  schedulerPrefix: string,
  reconcilerId: string,
): string[] {
  return schedulers.flatMap((scheduler) => {
    const id = scheduler.id ?? scheduler.key;
    if (!id.startsWith(schedulerPrefix) || id === reconcilerId) return [];
    return activeProjectIds.has(id.slice(schedulerPrefix.length)) ? [] : [id];
  });
}
