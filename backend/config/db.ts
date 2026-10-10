import { PrismaClient } from '@prisma/client';
import { logError } from '../logger';
export const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected successfully");
} catch (err: unknown) {
    logError("database.connection_failed", err);
    throw err;
  }
};
