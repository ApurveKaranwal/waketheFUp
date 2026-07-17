import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

export const connectDB = async() => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected successfully");
  }
  catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);    
  }
};