import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockPrisma,
    buildAuthResponseMock,
    getRefreshTokenExpiryDateMock,
    getPasswordResetExpiryDateMock,
    toPublicUserMock,
    hashPasswordMock,
    verifyPasswordMock,
    generateOpaqueTokenMock,
    hashOpaqueTokenMock,
    verifyRefreshTokenMock,
} = vi.hoisted(() => ({
    mockPrisma: { $transaction: vi.fn() },
    buildAuthResponseMock: vi.fn(),
    getRefreshTokenExpiryDateMock: vi.fn(),
    getPasswordResetExpiryDateMock: vi.fn(),
    toPublicUserMock: vi.fn(),
    hashPasswordMock: vi.fn(),
    verifyPasswordMock: vi.fn(),
    generateOpaqueTokenMock: vi.fn(),
    hashOpaqueTokenMock: vi.fn(),
    verifyRefreshTokenMock: vi.fn(),
}));

vi.mock('../config/database', () => ({
    prisma: mockPrisma,
}));

vi.mock('../config/auth.config', () => ({
    authConfig: { appUrl: 'http://localhost:3000' },
}));

vi.mock('../utils/auth', () => ({
    buildAuthResponse: buildAuthResponseMock,
    getRefreshTokenExpiryDate: getRefreshTokenExpiryDateMock,
    getPasswordResetExpiryDate: getPasswordResetExpiryDateMock,
    toPublicUser: toPublicUserMock,
}));

vi.mock('../utils/password', () => ({
    hashPassword: hashPasswordMock,
    verifyPassword: verifyPasswordMock,
    generateOpaqueToken: generateOpaqueTokenMock,
    hashOpaqueToken: hashOpaqueTokenMock,
}));

vi.mock('../utils/jwt', () => ({
    verifyRefreshToken: verifyRefreshTokenMock,
}));

import { AuthService } from '../services/auth.service';

function createUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        email: 'user@example.com',
        username: 'user_1',
        passwordHash: 'stored-password-hash',
        role: 'USER',
        isActive: true,
        displayName: 'User One',
        bio: null,
        avatarUrl: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        ...overrides,
    };
}

function createSession(overrides: Record<string, unknown> = {}) {
    return {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed:incoming-refresh-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        ...overrides,
    };
}

function createResetToken(overrides: Record<string, unknown> = {}) {
    return {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hashed:reset-token',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        consumedAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        user: createUser(),
        ...overrides,
    };
}

function createRepositoryMock() {
    return {
        transaction: vi.fn(),
        withClient: vi.fn(),
        findUserByEmail: vi.fn(),
        findUserByUsername: vi.fn(),
        findUserById: vi.fn(),
        createUser: vi.fn(),
        updateUserPassword: vi.fn(),
        findSessionById: vi.fn(),
        createSession: vi.fn(),
        updateSession: vi.fn(),
        revokeSession: vi.fn(),
        revokeUserSessions: vi.fn(),
        listActiveSessions: vi.fn(),
        findPasswordResetToken: vi.fn(),
        createPasswordResetToken: vi.fn(),
        consumePasswordResetToken: vi.fn(),
        consumeUserPasswordResetTokens: vi.fn(),
    };
}

async function expectAppError(
    promise: Promise<unknown>,
    expected: { message: string; statusCode: number },
) {
    await expect(promise).rejects.toMatchObject(expected);
}

describe('AuthService', () => {
    const metadata = {
        userAgent: 'Vitest',
        ipAddress: '127.0.0.1',
    };

    let repository: ReturnType<typeof createRepositoryMock>;
    let txRepository: ReturnType<typeof createRepositoryMock>;
    let emailService: { sendPasswordResetEmail: ReturnType<typeof vi.fn> };
    let service: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();

        repository = createRepositoryMock();
        txRepository = createRepositoryMock();
        emailService = { sendPasswordResetEmail: vi.fn() };
        service = new AuthService(repository as never, emailService as never);

        repository.transaction.mockImplementation(
            async (callback: (txRepository: unknown) => unknown) =>
                callback(txRepository),
        );
        repository.withClient.mockReturnValue(txRepository);
        mockPrisma.$transaction.mockImplementation(
            async (callback: (client: unknown) => unknown) => callback({}),
        );

        hashPasswordMock.mockImplementation(
            async (value: string) => `hashed-password:${value}`,
        );
        verifyPasswordMock.mockResolvedValue(false);
        generateOpaqueTokenMock.mockReturnValue('generated-reset-token');
        hashOpaqueTokenMock.mockImplementation(
            (value: string) => `hashed:${value}`,
        );
        verifyRefreshTokenMock.mockReturnValue({
            userId: 'user-1',
            sessionId: 'session-1',
            email: 'user@example.com',
            role: 'USER',
            tokenType: 'refresh',
        });
        getRefreshTokenExpiryDateMock.mockReturnValue(
            new Date('2099-01-01T00:00:00.000Z'),
        );
        getPasswordResetExpiryDateMock.mockReturnValue(
            new Date('2099-02-01T00:00:00.000Z'),
        );
        toPublicUserMock.mockImplementation((user) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
        }));
        buildAuthResponseMock.mockImplementation((user, sessionId) => ({
            user: toPublicUserMock(user),
            tokens: {
                accessToken: `access-token:${sessionId}`,
                refreshToken: `refresh-token:${sessionId}`,
                accessTokenExpiresInMinutes: 15,
                refreshTokenExpiresInDays: 7,
            },
        }));
    });

    describe('register', () => {
        it('should throw ConflictError when email already exists during registration', async () => {
            repository.findUserByEmail.mockResolvedValue(createUser());

            await expectAppError(
                service.register(
                    {
                        email: 'user@example.com',
                        username: 'new_user',
                        password: 'Password1',
                    },
                    metadata,
                ),
                { message: 'Email already exists', statusCode: 409 },
            );
        });

        it('should throw ConflictError when username already exists during registration', async () => {
            repository.findUserByEmail.mockResolvedValue(null);
            repository.findUserByUsername.mockResolvedValue(
                createUser({ username: 'new_user' }),
            );

            await expectAppError(
                service.register(
                    {
                        email: 'new@example.com',
                        username: 'new_user',
                        password: 'Password1',
                    },
                    metadata,
                ),
                { message: 'Username already exists', statusCode: 409 },
            );
        });

        it('should create user, create session, and return auth response when registration is valid', async () => {
            txRepository.createUser.mockResolvedValue(
                createUser({
                    email: 'new@example.com',
                    username: 'new_user',
                    displayName: 'new_user',
                }),
            );
            txRepository.createSession.mockResolvedValue(createSession());
            txRepository.updateSession.mockResolvedValue(createSession());

            const result = await service.register(
                {
                    email: 'new@example.com',
                    username: 'new_user',
                    password: 'Password1',
                },
                metadata,
            );

            expect(repository.transaction).toHaveBeenCalled();
            expect(hashPasswordMock).toHaveBeenCalledWith('Password1');
            expect(txRepository.createUser).toHaveBeenCalledWith({
                email: 'new@example.com',
                username: 'new_user',
                displayName: 'new_user',
                passwordHash: 'hashed-password:Password1',
                role: 'USER',
            });
            expect(txRepository.createSession).toHaveBeenCalled();
            expect(txRepository.updateSession).toHaveBeenCalled();
            expect(result.tokens.accessToken).toBe('access-token:session-1');
        });
    });

    describe('login', () => {
        it('should throw UnauthorizedError when login email does not exist', async () => {
            repository.findUserByEmail.mockResolvedValue(null);

            await expectAppError(
                service.login(
                    { email: 'missing@example.com', password: 'Password1' },
                    metadata,
                ),
                { message: 'Invalid credentials', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when login user is inactive', async () => {
            repository.findUserByEmail.mockResolvedValue(
                createUser({ isActive: false }),
            );

            await expectAppError(
                service.login(
                    { email: 'user@example.com', password: 'Password1' },
                    metadata,
                ),
                { message: 'Invalid credentials', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when login password is incorrect', async () => {
            repository.findUserByEmail.mockResolvedValue(createUser());

            await expectAppError(
                service.login(
                    { email: 'user@example.com', password: 'WrongPassword1' },
                    metadata,
                ),
                { message: 'Invalid credentials', statusCode: 401 },
            );
        });

        it('should create session and return auth response when login credentials are valid', async () => {
            repository.findUserByEmail.mockResolvedValue(createUser());
            verifyPasswordMock.mockResolvedValue(true);
            repository.createSession.mockResolvedValue(createSession());
            repository.updateSession.mockResolvedValue(createSession());

            const result = await service.login(
                { email: 'user@example.com', password: 'Password1' },
                metadata,
            );

            expect(repository.createSession).toHaveBeenCalled();
            expect(repository.updateSession).toHaveBeenCalled();
            expect(result.tokens.refreshToken).toBe('refresh-token:session-1');
        });
    });

    describe('refreshToken', () => {
        it('should throw UnauthorizedError when refresh token payload is not a refresh token', async () => {
            verifyRefreshTokenMock.mockReturnValue({ tokenType: 'access' });

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'invalid-type-token' },
                    metadata,
                ),
                { message: 'Invalid refresh token', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when refresh session does not exist', async () => {
            repository.findSessionById.mockResolvedValue(null);

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'refresh-token' },
                    metadata,
                ),
                { message: 'Refresh session not found', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when refresh session belongs to another user', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({ userId: 'another-user' }),
            );

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'refresh-token' },
                    metadata,
                ),
                { message: 'Refresh session not found', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when refresh session is revoked', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({ revokedAt: new Date() }),
            );

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'refresh-token' },
                    metadata,
                ),
                { message: 'Refresh session has expired', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when refresh session is expired', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({
                    expiresAt: new Date('2000-01-01T00:00:00.000Z'),
                }),
            );

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'refresh-token' },
                    metadata,
                ),
                { message: 'Refresh session has expired', statusCode: 401 },
            );
        });

        it('should revoke session and throw UnauthorizedError when refresh token hash does not match', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({ refreshTokenHash: 'hashed:another-token' }),
            );

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'incoming-refresh-token' },
                    metadata,
                ),
                {
                    message: 'Refresh token is no longer valid',
                    statusCode: 401,
                },
            );

            expect(repository.revokeSession).toHaveBeenCalledWith('session-1');
        });

        it('should throw UnauthorizedError when user linked to refresh session does not exist', async () => {
            repository.findSessionById.mockResolvedValue(createSession());
            repository.findUserById.mockResolvedValue(null);

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'incoming-refresh-token' },
                    metadata,
                ),
                { message: 'User is not authorized', statusCode: 401 },
            );
        });

        it('should throw UnauthorizedError when user linked to refresh session is inactive', async () => {
            repository.findSessionById.mockResolvedValue(createSession());
            repository.findUserById.mockResolvedValue(
                createUser({ isActive: false }),
            );

            await expectAppError(
                service.refreshToken(
                    { refreshToken: 'incoming-refresh-token' },
                    metadata,
                ),
                { message: 'User is not authorized', statusCode: 401 },
            );
        });

        it('should rotate refresh token and return auth response when refresh token is valid', async () => {
            repository.findSessionById.mockResolvedValue(createSession());
            repository.findUserById.mockResolvedValue(createUser());
            repository.updateSession.mockResolvedValue(createSession());

            const result = await service.refreshToken(
                { refreshToken: 'incoming-refresh-token' },
                metadata,
            );

            expect(repository.updateSession).toHaveBeenCalledWith(
                'session-1',
                expect.objectContaining({
                    refreshTokenHash: 'hashed:refresh-token:session-1',
                }),
            );
            expect(result.tokens.accessToken).toBe('access-token:session-1');
        });
    });

    describe('logout', () => {
        it('should throw NotFoundError when logout session does not exist', async () => {
            repository.findSessionById.mockResolvedValue(null);

            await expectAppError(service.logout('user-1', 'missing-session'), {
                message: 'Session not found',
                statusCode: 404,
            });
        });

        it('should throw NotFoundError when logout session belongs to another user', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({ userId: 'another-user' }),
            );

            await expectAppError(service.logout('user-1', 'session-1'), {
                message: 'Session not found',
                statusCode: 404,
            });
        });

        it('should revoke the session when logout request is valid', async () => {
            repository.findSessionById.mockResolvedValue(createSession());

            await service.logout('user-1', 'session-1');

            expect(repository.revokeSession).toHaveBeenCalledWith('session-1');
        });
    });

    describe('logoutAll', () => {
        it('should revoke all active sessions for the user', async () => {
            await service.logoutAll('user-1');

            expect(repository.revokeUserSessions).toHaveBeenCalledWith(
                'user-1',
            );
        });
    });

    describe('changePassword', () => {
        it('should throw NotFoundError when changePassword user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expectAppError(
                service.changePassword(
                    'user-1',
                    'session-1',
                    { currentPassword: 'Password1', newPassword: 'Password2' },
                    metadata,
                ),
                { message: 'User not found', statusCode: 404 },
            );
        });

        it('should throw UnauthorizedError when current password is incorrect during changePassword', async () => {
            repository.findUserById.mockResolvedValue(createUser());

            await expectAppError(
                service.changePassword(
                    'user-1',
                    'session-1',
                    {
                        currentPassword: 'WrongPassword1',
                        newPassword: 'Password2',
                    },
                    metadata,
                ),
                { message: 'Current password is invalid', statusCode: 401 },
            );
        });

        it('should throw ValidationError when new password matches current password during changePassword', async () => {
            repository.findUserById.mockResolvedValue(createUser());
            verifyPasswordMock
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);

            await expectAppError(
                service.changePassword(
                    'user-1',
                    'session-1',
                    { currentPassword: 'Password1', newPassword: 'Password1' },
                    metadata,
                ),
                {
                    message:
                        'New password must be different from the current password',
                    statusCode: 400,
                },
            );
        });

        it('should update password, revoke sessions, and return new auth response when changePassword succeeds', async () => {
            repository.findUserById.mockResolvedValue(createUser());
            verifyPasswordMock
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            txRepository.updateUserPassword.mockResolvedValue(
                createUser({ passwordHash: 'hashed-password:Password2' }),
            );
            txRepository.consumeUserPasswordResetTokens.mockResolvedValue({
                count: 1,
            });
            txRepository.revokeUserSessions.mockResolvedValue({ count: 2 });
            txRepository.createSession.mockResolvedValue(createSession());
            txRepository.updateSession.mockResolvedValue(createSession());

            const result = await service.changePassword(
                'user-1',
                'session-1',
                { currentPassword: 'Password1', newPassword: 'Password2' },
                metadata,
            );

            expect(txRepository.updateUserPassword).toHaveBeenCalledWith(
                'user-1',
                'hashed-password:Password2',
            );
            expect(
                txRepository.consumeUserPasswordResetTokens,
            ).toHaveBeenCalledWith('user-1');
            expect(txRepository.revokeUserSessions).toHaveBeenCalledWith(
                'user-1',
            );
            expect(result.tokens.accessToken).toBe('access-token:session-1');
        });
    });

    describe('forgotPassword', () => {
        it('should return without side effects when forgotPassword email does not exist', async () => {
            repository.findUserByEmail.mockResolvedValue(null);

            await service.forgotPassword({ email: 'missing@example.com' });

            expect(repository.transaction).not.toHaveBeenCalled();
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should return without side effects when forgotPassword user is inactive', async () => {
            repository.findUserByEmail.mockResolvedValue(
                createUser({ isActive: false }),
            );

            await service.forgotPassword({ email: 'inactive@example.com' });

            expect(repository.transaction).not.toHaveBeenCalled();
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should create reset token and send reset email when forgotPassword succeeds', async () => {
            repository.findUserByEmail.mockResolvedValue(createUser());

            await service.forgotPassword({ email: 'user@example.com' });

            expect(
                txRepository.consumeUserPasswordResetTokens,
            ).toHaveBeenCalledWith('user-1');
            expect(txRepository.createPasswordResetToken).toHaveBeenCalledWith({
                userId: 'user-1',
                tokenHash: 'hashed:generated-reset-token',
                expiresAt: new Date('2099-02-01T00:00:00.000Z'),
            });
            expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                'user@example.com',
                'http://localhost:3000/reset-password?token=generated-reset-token',
            );
        });
    });

    describe('resetPassword', () => {
        it('should throw UnauthorizedError when reset token does not exist', async () => {
            repository.findPasswordResetToken.mockResolvedValue(null);

            await expectAppError(
                service.resetPassword({
                    token: 'missing-token',
                    newPassword: 'Password2',
                }),
                {
                    message: 'Reset token is invalid or expired',
                    statusCode: 401,
                },
            );
        });

        it('should throw UnauthorizedError when reset token is already consumed', async () => {
            repository.findPasswordResetToken.mockResolvedValue(
                createResetToken({ consumedAt: new Date() }),
            );

            await expectAppError(
                service.resetPassword({
                    token: 'used-token',
                    newPassword: 'Password2',
                }),
                {
                    message: 'Reset token is invalid or expired',
                    statusCode: 401,
                },
            );
        });

        it('should throw UnauthorizedError when reset token is expired', async () => {
            repository.findPasswordResetToken.mockResolvedValue(
                createResetToken({
                    expiresAt: new Date('2000-01-01T00:00:00.000Z'),
                }),
            );

            await expectAppError(
                service.resetPassword({
                    token: 'expired-token',
                    newPassword: 'Password2',
                }),
                {
                    message: 'Reset token is invalid or expired',
                    statusCode: 401,
                },
            );
        });

        it('should throw UnauthorizedError when reset token user is inactive', async () => {
            repository.findPasswordResetToken.mockResolvedValue(
                createResetToken({ user: createUser({ isActive: false }) }),
            );

            await expectAppError(
                service.resetPassword({
                    token: 'inactive-user-token',
                    newPassword: 'Password2',
                }),
                {
                    message: 'Reset token is invalid or expired',
                    statusCode: 401,
                },
            );
        });

        it('should update password and revoke related tokens and sessions when resetPassword succeeds', async () => {
            repository.findPasswordResetToken.mockResolvedValue(
                createResetToken(),
            );

            await service.resetPassword({
                token: 'reset-token',
                newPassword: 'Password2',
            });

            expect(txRepository.updateUserPassword).toHaveBeenCalledWith(
                'user-1',
                'hashed-password:Password2',
            );
            expect(txRepository.consumePasswordResetToken).toHaveBeenCalledWith(
                'reset-1',
            );
            expect(
                txRepository.consumeUserPasswordResetTokens,
            ).toHaveBeenCalledWith('user-1');
            expect(txRepository.revokeUserSessions).toHaveBeenCalledWith(
                'user-1',
            );
        });
    });

    describe('getProfile', () => {
        it('should throw NotFoundError when profile user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expectAppError(service.getProfile('missing-user'), {
                message: 'User not found',
                statusCode: 404,
            });
        });

        it('should return public profile when profile user exists', async () => {
            const user = createUser();
            repository.findUserById.mockResolvedValue(user);

            const result = await service.getProfile('user-1');

            expect(toPublicUserMock).toHaveBeenCalledWith(user);
            expect(result.email).toBe('user@example.com');
        });
    });

    describe('listSessions', () => {
        it('should return active sessions mapped to response shape', async () => {
            repository.listActiveSessions.mockResolvedValue([
                createSession(),
                createSession({ id: 'session-2' }),
            ]);

            const result = await service.listSessions('user-1');

            expect(repository.listActiveSessions).toHaveBeenCalledWith(
                'user-1',
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: 'session-1',
                    userAgent: 'test-agent',
                }),
            );
        });
    });

    describe('revokeSession', () => {
        it('should throw NotFoundError when revokeSession target does not exist', async () => {
            repository.findSessionById.mockResolvedValue(null);

            await expectAppError(
                service.revokeSession('user-1', 'missing-session'),
                {
                    message: 'Session not found',
                    statusCode: 404,
                },
            );
        });

        it('should throw NotFoundError when revokeSession target belongs to another user', async () => {
            repository.findSessionById.mockResolvedValue(
                createSession({ userId: 'another-user' }),
            );

            await expectAppError(service.revokeSession('user-1', 'session-1'), {
                message: 'Session not found',
                statusCode: 404,
            });
        });

        it('should revoke the selected session when revokeSession is valid', async () => {
            repository.findSessionById.mockResolvedValue(createSession());

            await service.revokeSession('user-1', 'session-1');

            expect(repository.revokeSession).toHaveBeenCalledWith('session-1');
        });
    });
});
