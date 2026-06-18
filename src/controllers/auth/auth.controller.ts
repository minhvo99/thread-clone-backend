import { type Request, type Response } from 'express';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    resetPasswordSchema,
    sessionParamsSchema,
} from './auth.dto';
import type { AuthenticatedRequest } from '~/middleware/auth.middleware';
import { AuthService } from '~/services/auth.service';
import { getCurrentUser } from '~/utils/current-user';
import { toResponseBody } from '~/utils/response';

export class AuthController {
    constructor(private readonly authService: AuthService) {}

    register = async (req: Request, res: Response): Promise<void> => {
        const { body } = registerSchema.parse({ body: req.body });
        const response = await this.authService.register(
            body,
            this.getSessionMetadata(req),
        );
        const status = 201;

        res.status(status).json(
            toResponseBody({
                status,
                data: response,
                message: 'User registered successfully',
            }),
        );
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const { body } = loginSchema.parse({ body: req.body });
        const response = await this.authService.login(
            body,
            this.getSessionMetadata(req),
        );
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: response,
                message: 'User logged in successfully',
            }),
        );
    };

    refreshToken = async (req: Request, res: Response): Promise<void> => {
        const { body } = refreshTokenSchema.parse({ body: req.body });
        const response = await this.authService.refreshToken(
            body,
            this.getSessionMetadata(req),
        );
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: response,
                message: 'Token refreshed successfully',
            }),
        );
    };

    logout = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        const currentUser = getCurrentUser(req);

        await this.authService.logout(
            currentUser.userId,
            currentUser.sessionId,
        );
        res.status(204).send();
    };

    logoutAll = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        const currentUser = getCurrentUser(req);

        await this.authService.logoutAll(currentUser.userId);
        res.status(204).send();
    };

    changePassword = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        const currentUser = getCurrentUser(req);
        const { body } = changePasswordSchema.parse({ body: req.body });
        const response = await this.authService.changePassword(
            currentUser.userId,
            currentUser.sessionId,
            body,
            this.getSessionMetadata(req),
        );
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: response,
                message: 'Password changed successfully',
            }),
        );
    };

    forgotPassword = async (req: Request, res: Response): Promise<void> => {
        const { body } = forgotPasswordSchema.parse({ body: req.body });

        await this.authService.forgotPassword(body);
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                message:
                    'If the email exists, a password reset link has been sent successfully',
            }),
        );
    };

    resetPassword = async (req: Request, res: Response): Promise<void> => {
        const { body } = resetPasswordSchema.parse({ body: req.body });

        await this.authService.resetPassword(body);
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                message: 'Password has been reset successfully',
            }),
        );
    };

    me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const currentUser = getCurrentUser(req);
        const user = await this.authService.getProfile(currentUser.userId);
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: { user },
                message: 'Profile fetched successfully',
            }),
        );
    };

    listSessions = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        const currentUser = getCurrentUser(req);
        const sessions = await this.authService.listSessions(
            currentUser.userId,
        );
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: { sessions },
                message: 'Sessions fetched successfully',
            }),
        );
    };

    revokeSession = async (
        req: AuthenticatedRequest,
        res: Response,
    ): Promise<void> => {
        const currentUser = getCurrentUser(req);
        const { params } = sessionParamsSchema.parse({ params: req.params });

        await this.authService.revokeSession(
            currentUser.userId,
            params.sessionId,
        );
        res.status(204).send();
    };

    adminCheck = async (_req: Request, res: Response): Promise<void> => {
        const status = 200;

        res.status(status).json(
            toResponseBody({
                status,
                data: { ok: true },
                message: 'Admin authorization is working',
            }),
        );
    };

    private getSessionMetadata(req: Request) {
        return {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        };
    }
}
