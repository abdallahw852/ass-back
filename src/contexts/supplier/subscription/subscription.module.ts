import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { SubscriptionController } from './presentation/subscription.controller';
import { AdminPlansController } from './presentation/admin-plans.controller';
import { PlanOrmEntity } from './infrastructure/persistence/plan.orm-entity';
import { SubscriptionOrmEntity } from './infrastructure/persistence/subscription.orm-entity';
import { PlanRepository } from './infrastructure/plan.repository';
import { SubscriptionRepository } from './infrastructure/subscription.repository';
import { PLAN_REPOSITORY } from './domain/plan.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from './domain/subscription.repository.interface';
import { SubscribeHandler } from './application/commands/handlers/subscribe.handler';
import { CreatePlanHandler } from './application/commands/handlers/create-plan.handler';
import { UpdatePlanHandler } from './application/commands/handlers/update-plan.handler';
import { SetPlanStatusHandler } from './application/commands/handlers/set-plan-status.handler';
import { DeletePlanHandler } from './application/commands/handlers/delete-plan.handler';
import { HandlePaymentWebhookHandler } from './application/commands/handlers/handle-payment-webhook.handler';
import { HandleSubscriptionWebhookHandler } from './application/commands/handlers/handle-subscription-webhook.handler';
import { UpgradeSubscriptionHandler } from './application/commands/handlers/upgrade-subscription.handler';
import { CancelSubscriptionHandler } from './application/commands/handlers/cancel-subscription.handler';
import { ListPlansHandler } from './application/queries/list-plans.handler';
import { ListPlansAdminHandler } from './application/queries/list-plans-admin.handler';
import { GetSubscriptionHandler } from './application/queries/get-subscription.handler';
import { SubscriptionExpiryCron } from './infrastructure/cron/subscription-expiry.cron';
import { EntitlementModule } from '../../entitlement/entitlement.module';
import { PaymobPaymentAdapter } from '../../payment/infrastructure/paymob-payment.adapter';
import { PAYMENT_GATEWAY_PORT } from './application/ports/payment-gateway.port';
import { PaymentRecordOrmEntity } from '../../payment/infrastructure/persistence/payment-intent.orm-entity';
import { PaymentRecordRepository } from '../../payment/infrastructure/payment-intent.repository';
import { PAYMENT_RECORD_REPOSITORY } from '../../payment/domain/payment-intent.repository.interface';
import { WebhookEventOrmEntity } from '../../payment/infrastructure/persistence/webhook-event.orm-entity';
import { OrderModule } from '../../order/order.module';
import { SharedModule } from '../../../shared/shared.module';
import { SUPPLIER_REPOSITORY } from '../identity/domain/repositories/supplier.repository.interface';
import { SupplierOrmEntity } from '../identity/infrastructure/persistence/supplier.orm-entity';
import { SupplierRepository } from '../identity/infrastructure/persistence/supplier.repository';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    OrderModule,
    EntitlementModule,
    TypeOrmModule.forFeature(
      [
        PlanOrmEntity,
        SubscriptionOrmEntity,
        PaymentRecordOrmEntity,
        SupplierOrmEntity,
        WebhookEventOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [SubscriptionController, AdminPlansController],
  providers: [
    SubscribeHandler,
    CreatePlanHandler,
    UpdatePlanHandler,
    SetPlanStatusHandler,
    DeletePlanHandler,
    HandlePaymentWebhookHandler,
    HandleSubscriptionWebhookHandler,
    UpgradeSubscriptionHandler,
    CancelSubscriptionHandler,
    ListPlansHandler,
    ListPlansAdminHandler,
    GetSubscriptionHandler,
    SubscriptionExpiryCron,
    PlanRepository,
    SubscriptionRepository,
    PaymobPaymentAdapter,
    PaymentRecordRepository,
    SupplierRepository,
    { provide: PLAN_REPOSITORY, useExisting: PlanRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useExisting: SubscriptionRepository },
    { provide: PAYMENT_GATEWAY_PORT, useExisting: PaymobPaymentAdapter },
    {
      provide: PAYMENT_RECORD_REPOSITORY,
      useExisting: PaymentRecordRepository,
    },
    {
      provide: SUPPLIER_REPOSITORY,
      useExisting: SupplierRepository,
    },
  ],
  exports: [
    { provide: PLAN_REPOSITORY, useExisting: PlanRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useExisting: SubscriptionRepository },
    {
      provide: PAYMENT_RECORD_REPOSITORY,
      useExisting: PaymentRecordRepository,
    },
  ],
})
export class SubscriptionModule {}
