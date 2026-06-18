export type UserRole = 'USER' | 'ADMIN'

export interface PublicUser {
  id: string
  email: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  role: UserRole
  isActive: boolean
  createdAt: Date
}

export interface SessionMetadata {
  userAgent?: string
  ipAddress?: string
}

export interface JwtPayload {
  userId: string
  sessionId: string
  email: string
  role: UserRole
  tokenType: 'access' | 'refresh'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresInMinutes: number
  refreshTokenExpiresInDays: number
}

export interface AuthResponse {
  user: PublicUser
  tokens: AuthTokens
}

export interface RegisterInput {
  email: string
  username: string
  password: string
  displayName?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RefreshTokenInput {
  refreshToken: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export interface AuthenticatedUser {
  userId: string
  sessionId: string
  email: string
  role: UserRole
}
