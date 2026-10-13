import { PrismaClient } from '@prisma/client';
import { logError } from '../logger';
function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=5&pool_timeout=15`;
  }
  return url;
}

const dbUrl = getOptimizedDatabaseUrl();
export const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);


export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected successfully");
} catch (err: unknown) {
    logError("database.connection_failed", err);
    throw err;
  }
};
