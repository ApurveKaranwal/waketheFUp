import { PrismaClient } from "@prisma/client"; 
const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The development seed is disabled in production.");
  }

  const clerkId = process.env.DEV_CLERK_USER_ID;
  const email = process.env.DEV_USER_EMAIL;
  if (!clerkId || !email) {
    console.info("Skipping development seed: set DEV_CLERK_USER_ID and DEV_USER_EMAIL to create a local account.");
    return;
  }

  await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name: process.env.DEV_USER_NAME || email },
    update: { email, name: process.env.DEV_USER_NAME || email },
  });
  console.info("Development account seed complete.");
}

main()
  .catch((error) => {
    console.error("Development seed failed:", error instanceof Error ? error.name : "UnknownError");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
