import { describe, expect, it } from "bun:test";
import { isPublicAddress, resolvePublicMonitorUrl } from "./urlSafety";

describe("public monitor URL validation", () => {
  it("allows public IPv4 and IPv6 addresses", async () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    await expect(resolvePublicMonitorUrl("https://8.8.8.8/health")).resolves.toMatchObject({
      addresses: ["8.8.8.8"],
    });
  });

  it("blocks private, local, shared, and reserved IPv4 ranges", () => {
    for (const address of [
      "0.0.0.0",
      "10.1.2.3",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.20.10.2",
      "192.0.0.9",
      "192.0.2.1",
      "192.168.1.2",
      "198.18.0.1",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
      "255.255.255.255",
    ]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it("blocks non-global and transition IPv6 ranges", () => {
    for (const address of [
      "::",
      "::1",
      "::ffff:8.8.8.8",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
      "2001:1::1",
      "2002:0808:0808::1",
      "3fff::1",
    ]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it("rejects credentials, local hostnames, and non-HTTP schemes", async () => {
    await expect(resolvePublicMonitorUrl("http://user:pass@example.com")).rejects.toThrow();
    await expect(resolvePublicMonitorUrl("http://localhost/health")).rejects.toThrow();
    await expect(resolvePublicMonitorUrl("ftp://8.8.8.8/file")).rejects.toThrow();
  });
});
