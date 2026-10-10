import { startBackend } from "./runtime";
import { logError } from "./logger";

startBackend({ api: false, workers: true }).catch((error) => {
  logError("worker.startup_failed", error);
  process.exitCode = 1;
});
