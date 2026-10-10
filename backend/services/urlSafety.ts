import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DNS_TIMEOUT_MS = 3_000;

const blockedIPv4Ranges: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToBigInt(address: string): bigint | null {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts.reduce((value, part) => (value << 8n) | BigInt(part), 0n);
}

function ipv6ToBigInt(address: string): bigint | null {
  let value = address.toLowerCase().split("%")[0];
  if (!value || (value.match(/::/g) ?? []).length > 1) return null;

  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = ipv4ToBigInt(value.slice(lastColon + 1));
    if (ipv4 === null) return null;
    const high = Number((ipv4 >> 16n) & 0xffffn).toString(16);
    const low = Number(ipv4 & 0xffffn).toString(16);
    value = `${value.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const [leftText, rightText] = value.split("::");
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  const zeroCount = value.includes("::") ? 8 - left.length - right.length : 0;
  if (value.includes("::") && zeroCount < 1) return null;
  const groups = value.includes("::")
    ? [...left, ...Array(zeroCount).fill("0"), ...right]
    : left;
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;

  return groups.reduce((result, group) => (result << 16n) | BigInt(`0x${group}`), 0n);
}

function ipv4InCidr(address: bigint, network: string, prefix: number): boolean {
  const networkValue = ipv4ToBigInt(network);
  if (networkValue === null) return true;
  const shift = BigInt(32 - prefix);
  return (address >> shift) === (networkValue >> shift);
}

function ipv6InCidr(address: bigint, network: bigint, prefix: number): boolean {
  const shift = BigInt(128 - prefix);
  return (address >> shift) === (network >> shift);
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parsed = ipv4ToBigInt(address);
    return parsed !== null && !blockedIPv4Ranges.some(([network, prefix]) => ipv4InCidr(parsed, network, prefix));
  }

  if (family === 6) {
    const parsed = ipv6ToBigInt(address);
    if (parsed === null) return false;

    // Permit only global unicast (2000::/3), excluding protocol, relay,
    // documentation, and transition ranges that can encode other addresses.
    const inGlobalUnicast = (parsed >> 125n) === 1n;
    const blockedRanges: Array<[bigint, number]> = [
      [0x20010000000000000000000000000000n, 23], // protocol assignments, Teredo, benchmarking
      [0x20010db8000000000000000000000000n, 32], // documentation
      [0x20020000000000000000000000000000n, 16], // 6to4 transition
      [0x3fff0000000000000000000000000000n, 20], // documentation
    ];
    return inGlobalUnicast && !blockedRanges.some(([network, prefix]) => ipv6InCidr(parsed, network, prefix));
  }

  return false;
}

export type ResolvedMonitorTarget = {
  url: URL;
  addresses: string[];
};

export async function resolvePublicMonitorUrl(value: string): Promise<ResolvedMonitorTarget> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid public HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Monitor URLs must use HTTP or HTTPS and cannot contain credentials.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error("Monitor URLs must point to a publicly reachable host.");
  }

  let addresses: string[];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const resolved = await Promise.race([
        lookup(hostname, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("DNS lookup timed out")), DNS_TIMEOUT_MS);
        }),
      ]);
      addresses = resolved.map((entry) => entry.address);
    } catch {
      throw new Error("The monitor host could not be resolved to a public address.");
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) {
    throw new Error("Monitor URLs must resolve only to publicly routable IP addresses.");
  }

  return { url, addresses };
}

export async function assertPublicMonitorUrl(value: string): Promise<void> {
  await resolvePublicMonitorUrl(value);
}
