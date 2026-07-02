import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly instanceId: string;
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.instanceId =
      this.configService.get<string>('ULTRAMSG_INSTANCE_ID') || '';
    this.token = this.configService.get<string>('ULTRAMSG_TOKEN') || '';
    this.baseUrl = `https://api.ultramsg.com/${this.instanceId}`;
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    return this.sendMessage(phone, this.buildOtpMessage(otp));
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.instanceId || !this.token) {
      this.logger.warn('Ultramsg credentials not configured.');
      return false;
    }
    const payload = {
      token: this.token,
      to: this.formatPhoneForUltramsg(phone),
      body: message,
    };
    const response = await fetch(`${this.baseUrl}/messages/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      this.logger.warn(`Message sending failed with status ${response.status}`);
      return false;
    }
    const data = (await response.json()) as { sent?: string };
    return data.sent === 'true';
  }

  private formatPhoneForUltramsg(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  private buildOtpMessage(otp: string): string {
    return `Your verification code is: ${otp}`;
  }
}
