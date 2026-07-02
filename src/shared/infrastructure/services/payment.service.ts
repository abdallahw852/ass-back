import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebhookEvent {
  type: string;
  data: { object: { id: string } };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly configService: ConfigService) {}

  createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<{ id: string; client_secret: string }> {
    this.logger.log(
      `Mocking payment intent creation for ${params.metadata.planName}`,
    );
    return Promise.resolve({
      id: `mock_pi_${Date.now()}`,
      client_secret: `mock_secret_${Date.now()}`,
    });
  }

  constructWebhookEvent(rawBody: Buffer, _signature: string): WebhookEvent {
    this.logger.log('Mocking webhook event construction');
    try {
      return JSON.parse(rawBody.toString()) as WebhookEvent;
    } catch {
      return { type: '', data: { object: { id: '' } } };
    }
  }

  buildIdempotencyKey(
    operation: string,
    entityId: string,
    suffix?: string,
  ): string {
    const parts = [operation, entityId];
    if (suffix !== undefined) {
      parts.push(suffix);
    }
    return parts.join('-');
  }
}
