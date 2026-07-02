import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderService } from './application/order.service';
import { ORDER_DRAFT_REPOSITORY } from './domain/order-draft.repository.interface';
import { TRADE_ORDER_REPOSITORY } from './domain/order.repository.interface';
import { OrderDraftRepository } from './infrastructure/order-draft.repository';
import { TradeOrderRepository } from './infrastructure/order.repository';
import { OrderDraftOrmEntity } from './infrastructure/persistence/order-draft.orm-entity';
import { TradeOrderOrmEntity } from './infrastructure/persistence/trade-order.orm-entity';
import { OrderController } from './presentation/order.controller';
import { CheckoutCartHandler } from './application/commands/checkout-cart.handler';
import { MarkOrderPaidHandler } from './application/commands/mark-order-paid.handler';
import { MarkOrderShippedHandler } from './application/commands/mark-order-shipped.handler';
import { MarkOrderShippedByPlatformHandler } from './application/commands/mark-order-shipped-by-platform.handler';
import { MarkOrderDeliveredHandler } from './application/commands/mark-order-delivered.handler';
import { ConfirmOrderReceiptHandler } from './application/commands/confirm-order-receipt.handler';
import { OpenDisputeHandler } from './application/commands/open-dispute.handler';
import { RefundOrderHandler } from './application/commands/refund-order.handler';
import { CancelOrderHandler } from './application/commands/cancel-order.handler';
import { CreateOrderDraftFromQuotationHandler } from './application/commands/create-order-draft-from-quotation.handler';
import { CheckoutOrderDraftHandler } from './application/commands/checkout-order-draft.handler';
import { GetOrderHandler } from './application/queries/get-order.handler';
import { ListOrdersHandler } from './application/queries/list-orders.handler';
import { SharedModule } from '../../shared/shared.module';
import { CartModule } from '../cart/cart.module';
import { PaymentModule } from '../payment/payment.module';
import { PricingTierOrmEntity } from '../product/infrastructure/persistence/pricing-tier.orm-entity';
import { ProductOrmEntity } from '../product/infrastructure/persistence/product.orm-entity';
import { DisputeOrmEntity } from '../dispute/infrastructure/persistence/dispute.orm-entity';
import { IdempotencyStore } from '../../shared/idempotency/idempotency.store';
import { IdempotencyKeyOrmEntity } from '../../shared/idempotency/idempotency-key.entity';
import { IdempotencyGuard } from '../../shared/idempotency/idempotency.guard';
const commandHandlers = [
  CheckoutCartHandler,
  MarkOrderPaidHandler,
  MarkOrderShippedHandler,
  MarkOrderShippedByPlatformHandler,
  MarkOrderDeliveredHandler,
  ConfirmOrderReceiptHandler,
  OpenDisputeHandler,
  RefundOrderHandler,
  CancelOrderHandler,
  CreateOrderDraftFromQuotationHandler,
  CheckoutOrderDraftHandler,
];
const queryHandlers = [GetOrderHandler, ListOrdersHandler];

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    CartModule,
    PaymentModule,
    TypeOrmModule.forFeature(
      [
        OrderDraftOrmEntity,
        TradeOrderOrmEntity,
        PricingTierOrmEntity,
        ProductOrmEntity,
        DisputeOrmEntity,
        IdempotencyKeyOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderDraftRepository,
    { provide: ORDER_DRAFT_REPOSITORY, useExisting: OrderDraftRepository },
    TradeOrderRepository,
    { provide: TRADE_ORDER_REPOSITORY, useExisting: TradeOrderRepository },
    IdempotencyStore,
    IdempotencyGuard,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [
    { provide: ORDER_DRAFT_REPOSITORY, useExisting: OrderDraftRepository },
    { provide: TRADE_ORDER_REPOSITORY, useExisting: TradeOrderRepository },
    MarkOrderPaidHandler,
    MarkOrderShippedByPlatformHandler,
    TradeOrderRepository,
    TypeOrmModule,
  ],
})
export class OrderModule {}
