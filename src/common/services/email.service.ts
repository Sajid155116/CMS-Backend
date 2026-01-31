import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize nodemailer transporter
    const emailConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"CMS" <noreply@cms.com>'),
        to: email,
        subject: 'Verify Your Email - CMS',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to CMS!</h1>
                </div>
                <div class="content">
                  <p>Hi ${name},</p>
                  <p>Thank you for signing up! Please verify your email address to get started with CMS.</p>
                  <p style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                  </p>
                  <p>Or copy and paste this link in your browser:</p>
                  <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                  <p><strong>This link will expire in 24 hours.</strong></p>
                  <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                  <p>&copy; ${new Date().getFullYear()} CMS. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
          Welcome to CMS!
          
          Hi ${name},
          
          Thank you for signing up! Please verify your email address by clicking the link below:
          
          ${verificationUrl}
          
          This link will expire in 24 hours.
          
          If you didn't create an account, you can safely ignore this email.
        `,
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"CMS" <noreply@cms.com>'),
        to: email,
        subject: 'Welcome to CMS!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to CMS!</h1>
                </div>
                <div class="content">
                  <p>Hi ${name},</p>
                  <p>Your email has been verified successfully! You can now access all features of CMS.</p>
                  <p>Get started by uploading and managing your content.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
    }
  }
}
