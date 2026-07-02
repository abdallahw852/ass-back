import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  constructor(private readonly configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(
    email: string,
    code: string,
    ttlSeconds: number,
  ): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}. It expires in ${Math.floor(ttlSeconds / 60)} minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(ttlSeconds / 60)} minutes.</p>`,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    ttlSeconds: number,
  ): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    const minutes = Math.floor(ttlSeconds / 60);
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your password',
      text: `We received a request to reset your password. Open the link below to set a new password. This link expires in ${minutes} minutes.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Reset your password</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in <strong>${minutes} minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });
  }

  async sendTeamInviteEmail(
    email: string,
    inviteUrl: string,
    inviteeName: string,
  ): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'You have been invited to join a team',
      text: `Hello ${inviteeName},\n\nYou have been invited to join a supplier team. Click the link below to accept your invitation:\n\n${inviteUrl}\n\nIf you did not expect this invitation, you can safely ignore this email.`,
      html: `
        <p>Hello <strong>${inviteeName}</strong>,</p>
        <p>You have been invited to join a supplier team on ASAS.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Accept Invitation</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>If you did not expect this invitation, you can safely ignore this email.</p>
      `,
    });
  }

  async sendOrderStatusEmail(
    to: string,
    data: {
      subject: string;
      recipientName: string;
      orderRef: string;
      statusMessage: string;
      deepLink: string;
      ctaLabel: string;
    },
  ): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    await this.transporter.sendMail({
      from,
      to,
      subject: data.subject,
      text: `Hello ${data.recipientName},\n\n${data.statusMessage}\n\nOrder Reference: ${data.orderRef}\n\nView order: ${data.deepLink}`,
      html: `
        <p>Hello <strong>${this.escapeHtml(data.recipientName)}</strong>,</p>
        <p>${this.escapeHtml(data.statusMessage)}</p>
        <p><strong>Order Reference:</strong> ${this.escapeHtml(data.orderRef)}</p>
        <p><a href="${this.escapeHtml(data.deepLink)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${this.escapeHtml(data.ctaLabel)}</a></p>
        <p>Or copy: <a href="${this.escapeHtml(data.deepLink)}">${this.escapeHtml(data.deepLink)}</a></p>
      `,
    });
  }

  async sendApprovalDecisionEmail(
    to: string,
    data: {
      subject: string;
      recipientName: string;
      statusMessage: string;
      deepLink: string;
      ctaLabel: string;
      reason?: string | null;
    },
  ): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    const reasonHtml = data.reason
      ? `<p style="padding:12px;background:#f9f9f9;border-left:4px solid #ccc;margin:16px 0"><strong>Reason:</strong> ${this.escapeHtml(data.reason)}</p>`
      : '';
    const reasonText = data.reason ? `\n\nReason: ${data.reason}` : '';
    await this.transporter.sendMail({
      from,
      to,
      subject: data.subject,
      text: `Hello ${data.recipientName},\n\n${data.statusMessage}${reasonText}\n\n${data.deepLink}`,
      html: `
        <p>Hello <strong>${this.escapeHtml(data.recipientName)}</strong>,</p>
        <p>${this.escapeHtml(data.statusMessage)}</p>
        ${reasonHtml}
        <p><a href="${this.escapeHtml(data.deepLink)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${this.escapeHtml(data.ctaLabel)}</a></p>
        <p>Or copy: <a href="${this.escapeHtml(data.deepLink)}">${this.escapeHtml(data.deepLink)}</a></p>
      `,
    });
  }
}
