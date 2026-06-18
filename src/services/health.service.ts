import { HealthRepository } from '../repositories/health.repository';

export class HealthService {
    constructor(private readonly healthRepository: HealthRepository) {}

    getRootStatus() {
        return { ok: true };
    }

    getHealth() {
        return { ok: true };
    }

    async getDatabaseHealth() {
        await this.healthRepository.checkDatabase();

        return { ok: true, database: 'connected' };
    }
}
