import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from '../services/health.service';

function createHealthRepositoryMock() {
    return {
        checkDatabase: vi.fn(),
    };
}

describe('HealthService', () => {
    let repository: ReturnType<typeof createHealthRepositoryMock>;
    let service: HealthService;

    beforeEach(() => {
        repository = createHealthRepositoryMock();
        service = new HealthService(repository as never);
    });

    it('should return root status', () => {
        expect(service.getRootStatus()).toEqual({ ok: true });
    });

    it('should return health status', () => {
        expect(service.getHealth()).toEqual({ ok: true });
    });

    it('should check the database before returning database health', async () => {
        await expect(service.getDatabaseHealth()).resolves.toEqual({
            ok: true,
            database: 'connected',
        });

        expect(repository.checkDatabase).toHaveBeenCalledOnce();
    });

    it('should forward database health failures', async () => {
        repository.checkDatabase.mockRejectedValue(new Error('database down'));

        await expect(service.getDatabaseHealth()).rejects.toThrow(
            'database down',
        );
    });
});
