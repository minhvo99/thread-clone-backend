import type {
    AuthResponse,
    ChangePasswordInput,
    ForgotPasswordInput,
    LoginInput,
    RefreshTokenInput,
    RegisterInput,
    ResetPasswordInput,
    SessionMetadata,
} from '../types/auth';
import type { User } from '../generated/prisma/client';
import { authConfig } from '../config/auth.config';
import { AuthRepository } from '../repositories/auth.repository';
import {
    buildAuthResponse,
    getPasswordResetExpiryDate,
    getRefreshTokenExpiryDate,
    toPublicUser,
} from '../utils/auth';
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from '../utils/errors';
import { verifyRefreshToken } from '../utils/jwt';
import {
    generateOpaqueToken,
    hashOpaqueToken,
    hashPassword,
    verifyPassword,
} from '../utils/password';
import { EmailService } from './email.service';

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository = new AuthRepository(),
        private readonly emailService: EmailService = new EmailService(),
    ) {}

    async register(
        input: RegisterInput,
        metadata: SessionMetadata,
    ): Promise<AuthResponse> {
        const existingEmail = await this.authRepository.findUserByEmail(
            input.email,
        );

        if (existingEmail) {
            throw new ConflictError('Email already exists');
        }

        const existingUsername = await this.authRepository.findUserByUsername(
            input.username,
        );

        if (existingUsername) {
            throw new ConflictError('Username already exists');
        }

        const passwordHash = await hashPassword(input.password);

        return this.authRepository.transaction(async (repository) => {
            const user = await repository.createUser({
                email: input.email,
                username: input.username,
                displayName: input.displayName || input.username,
                passwordHash,
                role: 'USER',
            });

            return this.createSessionForUser(user, metadata, repository);
        });
    }

    async login(
        input: LoginInput,
        metadata: SessionMetadata,
    ): Promise<AuthResponse> {
        const user = await this.authRepository.findUserByEmail(input.email);

        if (!user || !user.isActive) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isValidPassword = await verifyPassword(
            input.password,
            user.passwordHash,
        );

        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid credentials');
        }

        return this.createSessionForUser(user, metadata);
    }

    async refreshToken(
        input: RefreshTokenInput,
        metadata: SessionMetadata,
    ): Promise<AuthResponse> {
        const payload = verifyRefreshToken(input.refreshToken);

        if (payload.tokenType !== 'refresh') {
            throw new UnauthorizedError('Invalid refresh token');
        }

        const session = await this.authRepository.findSessionById(
            payload.sessionId,
        );

        if (!session || session.userId !== payload.userId) {
            throw new UnauthorizedError('Refresh session not found');
        }

        if (session.revokedAt || session.expiresAt <= new Date()) {
            throw new UnauthorizedError('Refresh session has expired');
        }

        if (session.refreshTokenHash !== hashOpaqueToken(input.refreshToken)) {
            await this.authRepository.revokeSession(session.id);
            throw new UnauthorizedError('Refresh token is no longer valid');
        }

        const user = await this.authRepository.findUserById(payload.userId);

        if (!user || !user.isActive) {
            throw new UnauthorizedError('User is not authorized');
        }

        const response = buildAuthResponse(user, session.id);

        await this.authRepository.updateSession(session.id, {
            refreshTokenHash: hashOpaqueToken(response.tokens.refreshToken),
            expiresAt: getRefreshTokenExpiryDate(),
            lastUsedAt: new Date(),
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
        });

        return response;
    }

    async logout(userId: string, sessionId: string): Promise<void> {
        const session = await this.authRepository.findSessionById(sessionId);

        if (!session || session.userId !== userId) {
            throw new NotFoundError('Session not found');
        }

        await this.authRepository.revokeSession(sessionId);
    }

    async logoutAll(userId: string): Promise<void> {
        await this.authRepository.revokeUserSessions(userId);
    }

    async changePassword(
        userId: string,
        sessionId: string,
        input: ChangePasswordInput,
        metadata: SessionMetadata,
    ): Promise<AuthResponse> {
        const user = await this.authRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
            throw new UnauthorizedError('Current password is invalid');
        }

        if (await verifyPassword(input.newPassword, user.passwordHash)) {
            throw new ValidationError(
                'New password must be different from the current password',
            );
        }

        const passwordHash = await hashPassword(input.newPassword);

        return this.authRepository.transaction(async (repository) => {
            const updatedUser = await repository.updateUserPassword(
                userId,
                passwordHash,
            );
            await repository.consumeUserPasswordResetTokens(userId);
            await repository.revokeUserSessions(userId);

            return this.createSessionForUser(updatedUser, metadata, repository);
        });
    }

    async forgotPassword(input: ForgotPasswordInput): Promise<void> {
        const user = await this.authRepository.findUserByEmail(input.email);

        if (!user || !user.isActive) {
            return;
        }

        const token = generateOpaqueToken();

        await this.authRepository.transaction(async (repository) => {
            await repository.consumeUserPasswordResetTokens(user.id);
            await repository.createPasswordResetToken({
                userId: user.id,
                tokenHash: hashOpaqueToken(token),
                expiresAt: getPasswordResetExpiryDate(),
            });
        });

        const resetUrl = `${authConfig.appUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

        await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
    }

    async resetPassword(input: ResetPasswordInput): Promise<void> {
        const resetToken = await this.authRepository.findPasswordResetToken(
            hashOpaqueToken(input.token),
        );

        if (
            !resetToken
            || resetToken.consumedAt
            || resetToken.expiresAt <= new Date()
            || !resetToken.user.isActive
        ) {
            throw new UnauthorizedError('Reset token is invalid or expired');
        }

        const passwordHash = await hashPassword(input.newPassword);

        await this.authRepository.transaction(async (repository) => {
            await repository.updateUserPassword(
                resetToken.userId,
                passwordHash,
            );
            await repository.consumePasswordResetToken(resetToken.id);
            await repository.consumeUserPasswordResetTokens(resetToken.userId);
            await repository.revokeUserSessions(resetToken.userId);
        });
    }

    async getProfile(userId: string) {
        const user = await this.authRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return toPublicUser(user);
    }

    async listSessions(userId: string) {
        const sessions = await this.authRepository.listActiveSessions(userId);

        return sessions.map((session) => ({
            id: session.id,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            expiresAt: session.expiresAt,
            lastUsedAt: session.lastUsedAt,
            createdAt: session.createdAt,
        }));
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        const session = await this.authRepository.findSessionById(sessionId);

        if (!session || session.userId !== userId) {
            throw new NotFoundError('Session not found');
        }

        await this.authRepository.revokeSession(sessionId);
    }

    private async createSessionForUser(
        user: User,
        metadata: SessionMetadata,
        repository = this.authRepository,
    ): Promise<AuthResponse> {
        const session = await repository.createSession({
            userId: user.id,
            refreshTokenHash: 'pending',
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
            expiresAt: getRefreshTokenExpiryDate(),
        });

        const response = buildAuthResponse(user, session.id);

        await repository.updateSession(session.id, {
            refreshTokenHash: hashOpaqueToken(response.tokens.refreshToken),
            expiresAt: getRefreshTokenExpiryDate(),
            lastUsedAt: new Date(),
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
        });

        return response;
    }
}
