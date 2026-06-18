import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import { prisma } from '../config/database.js'

type AuthDbClient = PrismaClient | Prisma.TransactionClient

export class AuthRepository {
  constructor(private readonly db: AuthDbClient = prisma) {}

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } })
  }

  findUserByUsername(username: string) {
    return this.db.user.findUnique({ where: { username } })
  }

  findUserById(id: string) {
    return this.db.user.findUnique({ where: { id } })
  }

  createUser(data: Prisma.UserCreateInput) {
    return this.db.user.create({ data })
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  createSession(data: Prisma.AuthSessionUncheckedCreateInput) {
    return this.db.authSession.create({ data })
  }

  findSessionById(id: string) {
    return this.db.authSession.findUnique({ where: { id } })
  }

  listActiveSessions(userId: string) {
    return this.db.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  updateSessionToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.db.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
        userAgent,
        ipAddress,
      },
    })
  }

  revokeSession(sessionId: string) {
    return this.db.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  revokeUserSessions(userId: string) {
    return this.db.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  revokeOtherUserSessions(userId: string, currentSessionId: string) {
    return this.db.authSession.updateMany({
      where: {
        userId,
        id: {
          not: currentSessionId,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  deleteExpiredSessions() {
    return this.db.authSession.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    })
  }

  createPasswordResetToken(data: Prisma.PasswordResetTokenUncheckedCreateInput) {
    return this.db.passwordResetToken.create({ data })
  }

  findPasswordResetTokenByHash(tokenHash: string) {
    return this.db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  }

  markPasswordResetTokenConsumed(id: string) {
    return this.db.passwordResetToken.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    })
  }

  invalidateUserPasswordResetTokens(userId: string) {
    return this.db.passwordResetToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    })
  }
}
