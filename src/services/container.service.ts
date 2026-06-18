import { AuthController } from '~/controllers/auth/auth.controller';
import { AuthRepository } from '~/repositories/auth.repository';
import { AuthService } from '~/services/auth.service';
import { EmailService } from '~/services/email.service';

class Container {
    private readonly factories = new Map<string, () => unknown>();

    register<T>(key: string, factory: () => T): void {
        this.factories.set(key, factory);
    }

    singleton<T>(key: string, factory: () => T): void {
        let instance: T | undefined;

        this.factories.set(key, () => {
            if (!instance) {
                instance = factory();
            }

            return instance;
        });
    }

    resolve<T>(key: string): T {
        const factory = this.factories.get(key);

        if (!factory) {
            throw new Error(`No factory registered for ${key}`);
        }

        return factory() as T;
    }
}

export const container = new Container();

container.singleton('emailService', () => new EmailService());
container.singleton('authRepository', () => new AuthRepository());
container.singleton(
    'authService',
    () =>
        new AuthService(
            container.resolve<AuthRepository>('authRepository'),
            container.resolve<EmailService>('emailService'),
        ),
);
container.register(
    'authController',
    () => new AuthController(container.resolve<AuthService>('authService')),
);
