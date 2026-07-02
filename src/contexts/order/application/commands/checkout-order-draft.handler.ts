import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CheckoutOrderDraftCommand } from './checkout-order-draft.command';
import type { IOrderDraftRepository } from '../../domain/order-draft.repository.interface';
import { ORDER_DRAFT_REPOSITORY } from '../../domain/order-draft.repository.interface';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { TradeOrder } from '../../domain/trade-order.entity';
import {
  OrderAccessDeniedException,
  OrderDraftAlreadyCheckedOutException,
  OrderDraftNotFoundException,
} from '../../domain/order.exceptions';
import type { PaymentGatewayPort } from '../../../payment/application/ports/payment-gateway.port';
import { PAYMENT_GATEWAY_PORT } from '../../../payment/application/ports/payment-gateway.port';

@CommandHandler(CheckoutOrderDraftCommand)
export class CheckoutOrderDraftHandler implements ICommandHandler<CheckoutOrderDraftCommand> {
  constructor(
    @Inject(ORDER_DRAFT_REPOSITORY)
    private readonly orderDraftRepo: IOrderDraftRepository,
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(
    command: CheckoutOrderDraftCommand,
  ): Promise<Record<string, unknown>> {
    const draft = await this.orderDraftRepo.findByPublicId(command.draftId);
    if (!draft) throw new OrderDraftNotFoundException(command.draftId);

    if (draft.buyerId !== command.buyerId) {
      throw new OrderAccessDeniedException(command.draftId);
    }

    if (draft.status !== 'draft') {
      throw new OrderDraftAlreadyCheckedOutException(command.draftId);
    }

    // Mark draft as checked_out immediately to prevent double-checkout
    await this.orderDraftRepo.updateStatus(draft.id, 'checked_out');

    const items = draft.items.map((item) => ({
      productId: (item['quotationId'] as string) ?? randomUUID(),
      productName: item['productName'] as string,
      variantId: null,
      quantity: Number(item['quantity']),
      unitPrice: Number(item['unitPrice']),
      lineTotal: Number(item['totalPrice']),
    }));

    const paymentResult = await this.paymentGateway.createPaymentIntention({
      amountCents: Math.round(Number(draft.subtotal) * 100),
      currency: draft.currency,
      merchantOrderId: randomUUID(),
    });

    const order = TradeOrder.create({
      buyerId: draft.buyerId,
      supplierId: draft.supplierId,
      lines: items,
      currency: draft.currency,
      paymentIntentId: paymentResult.paymentIntentId,
      paymobOrderId: paymentResult.paymentIntentId,
      cartItemIds: [],
      shippingMethod: 'supplier',
      shippingCost: 0,
    });

    const saved = await this.tradeOrderRepo.save(order);
    await this.tradeOrderRepo.setRfqLink(
      saved.id,
      draft.rfqId,
      paymentResult.clientSecret,
    );

    return {
      order: {
        id: saved.id,
        referenceNumber: saved.referenceNumber,
        buyerId: saved.buyerId,
        supplierId: saved.supplierId,
        subtotal: saved.subtotal,
        currency: saved.currency,
        status: saved.status,
        createdAt: saved.createdAt,
      },
      clientSecret: paymentResult.clientSecret,
    };
  }
}
