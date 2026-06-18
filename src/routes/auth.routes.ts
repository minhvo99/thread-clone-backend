import { Router } from 'express'
import { container } from '~/container'
import { AuthController } from '~/controllers/auth/auth.controller'
import { authenticate, authorize } from '~/middleware/auth.middleware'
import { asyncHandler } from '~/middleware/error-handler'
import {
  authLimiter,
  forgotPasswordLimiter,
} from '~/middleware/rate-limit.middleware'
import { validate } from '~/middleware/validation.middleware'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from '~/controllers/auth/auth.dto'

const authRouter = Router()
const authController = container.resolve<AuthController>('authController')

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
)
authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
)
authRouter.post(
  '/refresh-token',
  authLimiter,
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken),
)
authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
)
authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
)
authRouter.post('/logout', authenticate, asyncHandler(authController.logout))
authRouter.post('/logout-all', authenticate, asyncHandler(authController.logoutAll))
authRouter.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
)
authRouter.get('/me', authenticate, asyncHandler(authController.me))
authRouter.get('/sessions', authenticate, asyncHandler(authController.listSessions))
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  asyncHandler(authController.revokeSession),
)
authRouter.get(
  '/admin/check',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(authController.adminCheck),
)

export default authRouter
