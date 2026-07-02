import {
  Body,
  Controller,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { HandlePaymentWebhookCommand } from '../../supplier/subscription/application/commands/handle-payment-webhook.command';
import { HandleSubscriptionWebhookCommand } from '../../supplier/subscription/application/commands/handle-subscription-webhook.command';

@AllowUnverified()
@Controller('payments')
export class PaymentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('webhook')
  async paymentWebhook(
    @Body() body: unknown,
    @Query('hmac') hmac: string,
  ): Promise<{ received: boolean }> {
    if (!hmac) {
      throw new BadRequestException('Missing hmac query parameter.');
    }
    return this.commandBus.execute(new HandlePaymentWebhookCommand(body, hmac));
  }

  @Post('subscription-webhook')
  async subscriptionWebhook(
    @Body() body: unknown,
    @Query('hmac') hmac: string,
  ): Promise<{ received: boolean }> {
    if (!hmac) {
      throw new BadRequestException('Missing hmac query parameter.');
    }
    return this.commandBus.execute(
      new HandleSubscriptionWebhookCommand(body, hmac),
    );
  }
}
