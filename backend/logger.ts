type SafeErrorDetails = { type: string; code?: string };

function safeErrorDetails(error: unknown): SafeErrorDetails {
  if (!(error instanceof Error)) return { type: "UnknownError" };
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return { type: error.name || "Error", ...(code ? { code } : {}) };
}

export function safeErrorSummary(error: unknown): string {
  const details = safeErrorDetails(error);
  return details.code ? `${details.type} (${details.code})` : details.type;
}

export function logError(event: string, error: unknown, fields: Record<string, string | number | boolean> = {}): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    event,
    error: safeErrorDetails(error),
    ...fields,
  }));
}

export function logInfo(event: string, fields: Record<string, string | number | boolean> = {}): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event,
    ...fields,
  }));
}
