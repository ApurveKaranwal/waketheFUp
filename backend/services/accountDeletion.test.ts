import { describe, expect, it } from "bun:test";
import { accountDeletionRetryAt, isIdentityAlreadyDeleted } from "./accountDeletion";

describe("account deletion retries", () => {
  it("treats an already-removed Clerk identity as complete", () => {
    expect(isIdentityAlreadyDeleted({ status: 404 })).toBe(true);
    expect(isIdentityAlreadyDeleted({ statusCode: 404 })).toBe(true);
    expect(isIdentityAlreadyDeleted({ status: 503 })).toBe(false);
    expect(isIdentityAlreadyDeleted(new Error("network failure"))).toBe(false);
  });

  it("uses capped exponential retry delays without mutating the reference time", () => {
    const now = new Date("2026-10-10T00:00:00.000Z");
    expect(accountDeletionRetryAt(now, 0).toISOString()).toBe("2026-10-10T00:00:30.000Z");
    expect(accountDeletionRetryAt(now, 3).toISOString()).toBe("2026-10-10T00:04:00.000Z");
    expect(accountDeletionRetryAt(now, 20).toISOString()).toBe("2026-10-11T00:00:00.000Z");
    expect(now.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
