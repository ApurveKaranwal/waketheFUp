import { PrismaClient } from "@prisma/client"; 
const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: "test@example.com"
    },
  });

  if (existingUser) {
    console.log("Dummy user already exists.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      clerkId: "temp-clerk-id",
      name: "Test User",
      email: "test@example.com",
    },
  });

  console.log("Dummy user Created:");
  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });