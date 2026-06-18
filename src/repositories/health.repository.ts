import { prisma } from '../config/database';
import type { PrismaClient } from '../generated/prisma/client';

export class HealthRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async checkDatabase(): Promise<void> {
        await this.db.$queryRaw`SELECT 1`;
    }
}
