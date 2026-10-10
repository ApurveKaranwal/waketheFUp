import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createServer, type Server } from "node:http";
import { requestMonitorStatus } from "./httpCheck";

describe("requestMonitorStatus", () => {
  let server: Server;
  let port: number;
  let privatePathRequests = 0;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(302, { Location: `http://127.0.0.1:${port}/private` });
        response.end();
        return;
      }
      if (request.url === "/private") privatePathRequests += 1;
      if (request.url === "/slow") return;
      response.writeHead(204);
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind");
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("uses the validated address and returns the HTTP status", async () => {
    const status = await requestMonitorStatus({
      url: new URL(`http://health-check.invalid:${port}/`),
      addresses: ["127.0.0.1"],
    });
    expect(status).toBe(204);
  });

  it("does not follow redirects", async () => {
    const status = await requestMonitorStatus({
      url: new URL(`http://health-check.invalid:${port}/redirect`),
      addresses: ["127.0.0.1"],
    });
    expect(status).toBe(302);
    expect(privatePathRequests).toBe(0);
  });

  it("bounds the request duration", async () => {
    await expect(requestMonitorStatus({
      url: new URL(`http://health-check.invalid:${port}/slow`),
      addresses: ["127.0.0.1"],
    }, 10)).rejects.toThrow("timed out");
  });
});
