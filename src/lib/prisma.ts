import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('Missing database config: DATABASE_URL');
  }

  return databaseUrl;
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });

export const prisma = new PrismaClient({ adapter });
