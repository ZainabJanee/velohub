import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create client
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      airtmAccount: 'client_airtm_123',
      availableBalance: 1000.00,
      reservedBalance: 0.00,
    },
  });

  // Create freelancer (provider)
  const provider = await prisma.user.upsert({
    where: { email: 'freelancer@example.com' },
    update: {},
    create: {
      email: 'freelancer@example.com',
      airtmAccount: 'freelancer_airtm_456',
      availableBalance: 150.00,
      reservedBalance: 0.00,
    },
  });

  console.log(`Seeding complete. Created/Verified Users: ${client.email}, ${provider.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
