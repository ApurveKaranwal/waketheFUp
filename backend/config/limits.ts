const configuredMonitorLimit = Number(process.env.MAX_MONITORS_PER_USER ?? 10);

if (!Number.isInteger(configuredMonitorLimit) || configuredMonitorLimit < 1) {
  throw new Error("MAX_MONITORS_PER_USER must be a positive integer.");
}

export const MAX_MONITORS_PER_USER = configuredMonitorLimit;
