import * as http from "node:http";
import * as https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { TLSSocket } from "node:tls";
import type { ResolvedMonitorTarget } from "./urlSafety";

export const MONITOR_TIMEOUT_MS = 10_000;

export type SslCertificateInfo = {
  valid: boolean;
  daysRemaining: number;
  expiresAt: string;
};

export type MonitorCheckResult = {
  status: number;
  ssl?: SslCertificateInfo;
};

export function requestMonitorCheck(
  target: ResolvedMonitorTarget,
  timeoutMs = MONITOR_TIMEOUT_MS,
): Promise<MonitorCheckResult> {
  const { url, addresses } = target;
  let addressIndex = 0;
  let timeout: ReturnType<typeof setTimeout>;

  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses.map((address) => ({ address, family: isIP(address) })));
      return;
    }
    const address = addresses[addressIndex % addresses.length];
    addressIndex += 1;
    callback(null, address, isIP(address));
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const handleResponse = (response: http.IncomingMessage) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const status = response.statusCode ?? 0;

      let ssl: SslCertificateInfo | undefined;
      if (url.protocol === "https:" && response.socket) {
        const tlsSocket = response.socket as TLSSocket;
        if (typeof tlsSocket.getPeerCertificate === "function") {
          try {
            const cert = tlsSocket.getPeerCertificate();
            if (cert && cert.valid_to) {
              const expires = new Date(cert.valid_to);
              const now = Date.now();
              const daysRemaining = Math.max(0, Math.floor((expires.getTime() - now) / 86_400_000));
              ssl = {
                valid: daysRemaining > 0,
                daysRemaining,
                expiresAt: expires.toISOString(),
              };
            }
          } catch {
            // Certificate extraction ignored if unavailable
          }
        }
      }

      response.destroy();
      resolve({ status, ssl });
    };

    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const request = url.protocol === "https:"
      ? https.request(url, {
          lookup: pinnedLookup,
          servername: isIP(hostname) ? undefined : hostname,
        }, handleResponse)
      : http.request(url, { lookup: pinnedLookup }, handleResponse);

    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      request.destroy(new Error("Monitor request timed out"));
      reject(new Error("Monitor request timed out"));
    }, timeoutMs);

    request.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    request.end();
  });
}

export async function requestMonitorStatus(
  target: ResolvedMonitorTarget,
  timeoutMs = MONITOR_TIMEOUT_MS,
): Promise<number> {
  const result = await requestMonitorCheck(target, timeoutMs);
  return result.status;
}
