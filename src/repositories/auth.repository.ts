import type { Prisma, PrismaClient } from '../generated/prisma/client'
import { prisma } from '../config/database'
import { DbRepository } from './db.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export class AuthRepository extends DbRepository<DbClient['user']> {
  constructor(private readonly db: DbClient = prisma) {
    super(db.user)
  }

  withClient(db: DbClient): AuthRepository {
    return new AuthRepository(db)
  }

  findUserByEmail(email: string) {
    return this.findUnique({ where: { email } })
  }

  findUserByUsername(username: string) {
    return this.findUnique({ where: { username } })
  }

  findUserById(id: string) {
    return this.findUnique({ where: { id } })
  }

  createUser(data: Prisma.UserCreateInput) {
    return this.create({ data })
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  findSessionById(sessionId: string) {
    return this.db.authSession.findUnique({ where: { id: sessionId } })
  }

  createSession(data: Prisma.AuthSessionCreateArgs['data']) {
    return this.db.authSession.create({ data })
  }

  updateSession(sessionId: string, data: Prisma.AuthSessionUpdateArgs['data']) {
    return this.db.authSession.update({
      where: { id: sessionId },
      data,
    })
  }

  revokeSession(sessionId: string) {
    return this.db.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  revokeUserSessions(userId: string) {
    return this.db.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  listActiveSessions(userId: string) {
    return this.db.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  findPasswordResetToken(tokenHash: string) {
    return this.db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  }

  createPasswordResetToken(data: Prisma.PasswordResetTokenCreateArgs['data']) {
    return this.db.passwordResetToken.create({ data })
  }

  consumePasswordResetToken(id: string) {
    return this.db.passwordResetToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    })
  }

  consumeUserPasswordResetTokens(userId: string) {
    return this.db.passwordResetToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    })
  }
}
