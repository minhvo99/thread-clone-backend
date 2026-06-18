import { Router } from 'express';
import { AuthController } from '~/controllers/auth/auth.controller';
import { authenticate, authorize } from '~/middleware/auth.middleware';
import { asyncHandler } from '~/middleware/error-handler';
import {
    authLimiter,
    forgotPasswordLimiter,
} from '~/middleware/rate-limit.middleware';
import { AuthRepository } from '~/repositories/auth.repository';
import { AuthService } from '~/services/auth.service';
import { EmailService } from '~/services/email.service';

export function buildAuthRouter() {
    const authRouter = Router();
    const authRepository = new AuthRepository();
    const emailService = new EmailService();
    const authService = new AuthService(authRepository, emailService);
    const authController = new AuthController(authService);

    authRouter.post(
        '/register',
        authLimiter,
        asyncHandler(authController.register),
    );
    authRouter.post('/login', authLimiter, asyncHandler(authController.login));
    authRouter.post(
        '/refresh-token',
        authLimiter,
        asyncHandler(authController.refreshToken),
    );
    authRouter.post(
        '/forgot-password',
        forgotPasswordLimiter,
        asyncHandler(authController.forgotPassword),
    );
    authRouter.post(
        '/reset-password',
        authLimiter,
        asyncHandler(authController.resetPassword),
    );
    authRouter.post(
        '/logout',
        authenticate,
        asyncHandler(authController.logout),
    );
    authRouter.post(
        '/logout-all',
        authenticate,
        asyncHandler(authController.logoutAll),
    );
    authRouter.post(
        '/change-password',
        authenticate,
        authLimiter,
        asyncHandler(authController.changePassword),
    );
    authRouter.get('/me', authenticate, asyncHandler(authController.me));
    authRouter.get(
        '/sessions',
        authenticate,
        asyncHandler(authController.listSessions),
    );
    authRouter.delete(
        '/sessions/:sessionId',
        authenticate,
        asyncHandler(authController.revokeSession),
    );
    authRouter.get(
        '/admin/check',
        authenticate,
        authorize('ADMIN'),
        asyncHandler(authController.adminCheck),
    );

    return authRouter;
}
