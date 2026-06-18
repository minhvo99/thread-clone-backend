import nodemailer from 'nodemailer'
import { authConfig } from '../config/auth.js'

export class EmailService {
  private readonly transporter =
    authConfig.smtpHost && authConfig.smtpUser && authConfig.smtpPass
      ? nodemailer.createTransport({
          host: authConfig.smtpHost,
          port: authConfig.smtpPort,
          secure: authConfig.smtpSecure,
          auth: {
            user: authConfig.smtpUser,
            pass: authConfig.smtpPass,
          },
        })
      : null

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    if (!this.transporter || !authConfig.emailFrom) {
      console.log(
        JSON.stringify({
          event: 'password_reset_email_preview',
          email,
          resetUrl,
        }),
      )
      return
    }

    await this.transporter.sendMail({
      from: authConfig.emailFrom,
      to: email,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    })
  }
}
