import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@perceivegrade.com';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailService = process.env.EMAIL_SERVICE;
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.warn('Email credentials not configured. Email functionality will be disabled.');
      return;
    }

    try {
      const config: EmailConfig = {
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      };

      if (emailService) {
        // Use service like 'gmail', 'outlook', etc.
        config.service = emailService;
      } else if (emailHost) {
        // Use custom SMTP settings
        config.host = emailHost;
        config.port = emailPort;
        config.secure = emailPort === 465; // true for 465, false for other ports
      } else {
        // Default to Gmail
        config.service = 'gmail';
      }

      this.transporter = nodemailer.createTransporter(config);
      
      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          console.error('Email service configuration error:', error);
          this.transporter = null;
        } else {
          console.log('Email service ready');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not available');
      return false;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Verify Your Email Address - Perceive AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Perceive AI!</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName},</p>
              <p>Thank you for registering with Perceive AI! To complete your registration and start using our AI-powered assessment platform, please verify your email address.</p>
              
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              
              <p>If you can't click the button above, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
              
              <p>This verification link will expire in 24 hours for security reasons.</p>
              
              <p>If you didn't create an account with Perceive AI, please ignore this email.</p>
              
              <p>Best regards,<br>The Perceive AI Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Perceive AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not available');
      return false;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Password Reset Request - Perceive AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName},</p>
              <p>We received a request to reset your password for your Perceive AI account.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and contact support if you have concerns.
              </div>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <p>If you can't click the button above, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              
              <p>This password reset link will expire in 1 hour for security reasons.</p>
              
              <p>Best regards,<br>The Perceive AI Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Perceive AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  isServiceAvailable(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();