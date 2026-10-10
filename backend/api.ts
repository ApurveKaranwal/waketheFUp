import { startBackend } from "./runtime";
import { logError } from "./logger";

startBackend({ api: true, workers: false }).catch((error) => {
  logError("api.startup_failed", error);
  process.exitCode = 1;
});
