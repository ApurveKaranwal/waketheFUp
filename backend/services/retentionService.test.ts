import { describe, expect, it } from "bun:test";
import { retentionCutoff } from "./retentionService";

describe("retentionCutoff", () => {
  it("computes an exact UTC duration without changing the input date", () => {
    const now = new Date("2026-10-10T12:00:00.000Z");
    const cutoff = retentionCutoff(now, 90);

    expect(cutoff.toISOString()).toBe("2026-07-12T12:00:00.000Z");
    expect(now.toISOString()).toBe("2026-10-10T12:00:00.000Z");
  });
});
