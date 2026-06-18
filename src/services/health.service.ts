import { prisma } from '../config/database.js'

export class HealthService {
  async checkDatabase(): Promise<{ ok: true; database: 'connected' }> {
    await prisma.$queryRaw`SELECT 1`

    return {
      ok: true,
      database: 'connected',
    }
  }
}
