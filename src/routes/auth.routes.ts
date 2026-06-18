import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../middleware/error-handler.js'
import {
  authLimiter,
  forgotPasswordLimiter,
} from '../middleware/rate-limit.middleware.js'
import { validate } from '../middleware/validation.middleware.js'
import { AuthService } from '../services/auth.service.js'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.schemas.js'

const authRouter = Router()
const authController = new AuthController(new AuthService())

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
