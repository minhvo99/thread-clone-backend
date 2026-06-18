import { type Request, type Response } from "express";
import { AuthService } from "~/services/auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const response = await this.authService.register(
      req.body,
      this.getSessionMetadata(req),
    );
    res.status(201).json(response);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const response = await this.authService.login(
      req.body,
      this.getSessionMetadata(req),
    );
    res.json(response);
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const response = await this.authService.refreshToken(
      req.body,
      this.getSessionMetadata(req),
    );
    res.json(response);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(req.user!.userId, req.user!.sessionId);
    res.status(204).send();
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logoutAll(req.user!.userId);
    res.status(204).send();
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const response = await this.authService.changePassword(
      req.user!.userId,
      req.user!.sessionId,
      req.body,
      this.getSessionMetadata(req),
    );
    res.json(response);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.forgotPassword(req.body);
    res.json({
      message:
        "If the email exists, a password reset link has been sent successfully",
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.resetPassword(req.body);
    res.json({ message: "Password has been reset successfully" });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.authService.getProfile(req.user!.userId);
    res.json({ user });
  };

  listSessions = async (req: Request, res: Response): Promise<void> => {
    const sessions = await this.authService.listSessions(req.user!.userId);
    res.json({ sessions });
  };

  revokeSession = async (req: Request, res: Response): Promise<void> => {
    await this.authService.revokeSession(
      req.user!.userId,
      String(req.params.sessionId),
    );
    res.status(204).send();
  };

  adminCheck = async (_req: Request, res: Response): Promise<void> => {
    res.json({ ok: true, message: "Admin authorization is working" });
  };

  private getSessionMetadata(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };
  }
}
