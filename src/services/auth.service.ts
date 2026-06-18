import type {
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  SessionMetadata,
} from '../types/auth.js'
import type { User } from '../generated/prisma/client.js'
import { prisma } from '../config/database.js'
import { authConfig } from '../config/auth.js'
import { AuthRepository } from '../repositories/auth.repository.js'
import { hashOpaqueToken, hashPassword, verifyPassword, generateOpaqueToken } from '../utils/password.js'
import { buildAuthResponse, getPasswordResetExpiryDate, getRefreshTokenExpiryDate, toPublicUser } from '../utils/auth.js'
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js'
import { verifyRefreshToken } from '../utils/jwt.js'
import { EmailService } from './email.service.js'

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository = new AuthRepository(),
    private readonly emailService: EmailService = new EmailService(),
  ) {}

  async register(input: RegisterInput, metadata: SessionMetadata): Promise<AuthResponse> {
    const existingEmail = await this.authRepository.findUserByEmail(input.email)

    if (existingEmail) {
      throw new ConflictError('Email already exists')
    }

    const existingUsername = await this.authRepository.findUserByUsername(input.username)

    if (existingUsername) {
      throw new ConflictError('Username already exists')
    }

    const passwordHash = await hashPassword(input.password)

    const result = await prisma.$transaction(async (tx) => {
      const repository = new AuthRepository(tx)
      const user = await repository.createUser({
        email: input.email,
        username: input.username,
        displayName: input.displayName || input.username,
        passwordHash,
        role: 'USER',
      })

      return this.createSessionForUser(repository, user, metadata)
    })

    return result
  }

  async login(input: LoginInput, metadata: SessionMetadata): Promise<AuthResponse> {
    const user = await this.authRepository.findUserByEmail(input.email)

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials')
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash)

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials')
    }

    return this.createSessionForUser(this.authRepository, user, metadata)
  }

  async refreshToken(
    input: RefreshTokenInput,
    metadata: SessionMetadata,
  ): Promise<AuthResponse> {
    const payload = verifyRefreshToken(input.refreshToken)

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token')
    }

    const session = await this.authRepository.findSessionById(payload.sessionId)

    if (!session || session.userId !== payload.userId) {
      throw new UnauthorizedError('Refresh session not found')
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedError('Refresh session has expired')
    }

    const incomingHash = hashOpaqueToken(input.refreshToken)

    if (session.refreshTokenHash !== incomingHash) {
      await this.authRepository.revokeSession(session.id)
      throw new UnauthorizedError('Refresh token is no longer valid')
    }

    const user = await this.authRepository.findUserById(payload.userId)

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User is not authorized')
    }

    const response = buildAuthResponse(user, session.id)

    await this.authRepository.updateSessionToken(
      session.id,
      hashOpaqueToken(response.tokens.refreshToken),
      getRefreshTokenExpiryDate(),
      metadata.userAgent,
      metadata.ipAddress,
    )

    return response
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    const session = await this.authRepository.findSessionById(sessionId)

    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found')
    }

    await this.authRepository.revokeSession(sessionId)
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authRepository.revokeUserSessions(userId)
  }

  async changePassword(
    userId: string,
    sessionId: string,
    input: ChangePasswordInput,
    metadata: SessionMetadata,
  ): Promise<AuthResponse> {
    const user = await this.authRepository.findUserById(userId)

    if (!user) {
      throw new NotFoundError('User not found')
    }

    const isValidPassword = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    )

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is invalid')
    }

    const isSamePassword = await verifyPassword(input.newPassword, user.passwordHash)

    if (isSamePassword) {
      throw new ValidationError('New password must be different from the current password')
    }

    const passwordHash = await hashPassword(input.newPassword)

    return prisma.$transaction(async (tx) => {
      const repository = new AuthRepository(tx)
      const updatedUser = await repository.updateUserPassword(userId, passwordHash)
      await repository.invalidateUserPasswordResetTokens(userId)
      await repository.revokeUserSessions(userId)

      return this.createSessionForUser(repository, updatedUser, metadata)
    })
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.authRepository.findUserByEmail(input.email)

    if (!user || !user.isActive) {
      return
    }

    const token = generateOpaqueToken()
    const tokenHash = hashOpaqueToken(token)
    const expiresAt = getPasswordResetExpiryDate()

    await prisma.$transaction(async (tx) => {
      const repository = new AuthRepository(tx)
      await repository.invalidateUserPasswordResetTokens(user.id)
      await repository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      })
    })

    const resetUrl = `${authConfig.appUrl.replace(/\/$/, '')}/reset-password?token=${token}`

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl)
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashOpaqueToken(input.token)
    const resetToken = await this.authRepository.findPasswordResetTokenByHash(tokenHash)

    if (
      !resetToken ||
      resetToken.consumedAt ||
      resetToken.expiresAt <= new Date() ||
      !resetToken.user.isActive
    ) {
      throw new UnauthorizedError('Reset token is invalid or expired')
    }

    const passwordHash = await hashPassword(input.newPassword)

    await prisma.$transaction(async (tx) => {
      const repository = new AuthRepository(tx)
      await repository.updateUserPassword(resetToken.userId, passwordHash)
      await repository.markPasswordResetTokenConsumed(resetToken.id)
      await repository.invalidateUserPasswordResetTokens(resetToken.userId)
      await repository.revokeUserSessions(resetToken.userId)
    })
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findUserById(userId)

    if (!user) {
      throw new NotFoundError('User not found')
    }

    return toPublicUser(user)
  }

  async listSessions(userId: string) {
    const sessions = await this.authRepository.listActiveSessions(userId)

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
    }))
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.authRepository.findSessionById(sessionId)

    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found')
    }

    await this.authRepository.revokeSession(sessionId)
  }

  private async createSessionForUser(
    repository: AuthRepository,
    user: User,
    metadata: SessionMetadata,
  ): Promise<AuthResponse> {
    const session = await repository.createSession({
      userId: user.id,
      refreshTokenHash: 'pending',
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt: getRefreshTokenExpiryDate(),
    })

    const response = buildAuthResponse(user, session.id)

    await repository.updateSessionToken(
      session.id,
      hashOpaqueToken(response.tokens.refreshToken),
      getRefreshTokenExpiryDate(),
      metadata.userAgent,
      metadata.ipAddress,
    )

    return response
  }
}
