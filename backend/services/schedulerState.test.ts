import { describe, expect, it } from "bun:test";
import { findStaleProjectSchedulerIds } from "./schedulerState";

describe("findStaleProjectSchedulerIds", () => {
  it("uses BullMQ scheduler keys and preserves active and maintenance schedules", () => {
    const stale = findStaleProjectSchedulerIds(
      [
        { key: "project-active" },
        { key: "project-deleted" },
        { key: "project-scheduler-reconciler" },
        { key: "email-alert-dispatcher" },
      ],
      new Set(["active"]),
      "project-",
      "project-scheduler-reconciler",
    );

    expect(stale).toEqual(["project-deleted"]);
  });
});
