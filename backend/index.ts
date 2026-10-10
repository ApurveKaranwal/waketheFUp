import { startBackend } from "./runtime";
import { logError } from "./logger";

// The combined process keeps the existing local development command working.
// Production should run backend/api.ts and backend/worker.ts as separate services.
startBackend({ api: true, workers: true }).catch((error) => {
  logError("backend.startup_failed", error);
  process.exitCode = 1;
});
