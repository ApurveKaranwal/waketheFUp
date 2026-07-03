const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connectDB = aysnc() => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected successfully");
  }
  catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);    
  }
};

module.exports = {
  prisma,
  connectDB
};