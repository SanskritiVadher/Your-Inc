const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8') + '\n' + fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=['"]?([^'"\r\n]+)/);
if (match) process.env.DATABASE_URL = match[1];

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst();
  const decks = await prisma.deck.count();
  console.log(JSON.stringify({
    name: u?.name,
    locationEnabled: u?.locationEnabled,
    decks,
    targetRole: u?.targetRole,
    placementDate: u?.placementDate,
    cohortId: u?.cohortId,
    isAdmin: u?.isAdmin
  }));
}

main().finally(() => prisma.$disconnect());
