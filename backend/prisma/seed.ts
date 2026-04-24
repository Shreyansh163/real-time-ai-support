import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const AI_USER_EMAIL = "ai-bot@system.local";

const users = [
  { name: "AI Assistant", email: AI_USER_EMAIL, password: "__unreachable__", role: Role.ADMIN },
  { name: "Admin", email: "admin@test.com", password: "password", role: Role.ADMIN },
  { name: "Agent One", email: "agent1@test.com", password: "password", role: Role.AGENT },
  { name: "Agent Two", email: "agent2@test.com", password: "password", role: Role.AGENT },
  { name: "Customer One", email: "customer1@test.com", password: "password", role: Role.CUSTOMER },
  { name: "Customer Two", email: "customer2@test.com", password: "password", role: Role.CUSTOMER },
];

async function main() {
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { ...u, password: hashed },
    });

    if (u.role === Role.AGENT) {
      await prisma.agentStatus.upsert({
        where: { agentId: user.id },
        update: {},
        create: { agentId: user.id, isOnline: false, activeChats: 0 },
      });
    }

    console.log(`✅ Seeded ${u.role}: ${u.email}`);
  }

  console.log("\nLogin credentials (all use password: 'password'):");
  users.forEach(u => console.log(`  ${u.role.padEnd(9)} ${u.email}`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
