import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { EscrowOrmEntity } from './infrastructure/persistence/escrow.orm-entity';
import { LedgerEntryOrmEntity } from './infrastructure/persistence/ledger-entry.orm-entity';
import { SupplierWalletOrmEntity } from '../wallet/infrastructure/persistence/supplier-wallet.orm-entity';
import { DisputeOrmEntity } from '../dispute/infrastructure/persistence/dispute.orm-entity';
import { FundEscrowHandler } from './application/commands/fund-escrow.handler';
import { ReleaseMilestoneHandler } from './application/commands/release-milestone.handler';
import { FreezeEscrowHandler } from './application/commands/freeze-escrow.handler';
import { UnfreezeEscrowHandler } from './application/commands/unfreeze-escrow.handler';
import { RefundEscrowHandler } from './application/commands/refund-escrow.handler';
import { EscrowListener } from './presentation/event-listeners/escrow.listener';
import { EscrowAutoReleaseCron } from './infrastructure/cron/escrow-auto-release.cron';
import { ReleaseOrderHandler } from '../order/application/commands/release-order.handler';
import { OrderModule } from '../order/order.module';
import { PaymentModule } from '../payment/payment.module';

const commandHandlers = [
  FundEscrowHandler,
  ReleaseMilestoneHandler,
  FreezeEscrowHandler,
  UnfreezeEscrowHandler,
  RefundEscrowHandler,
  ReleaseOrderHandler,
];

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    OrderModule,
    PaymentModule,
    EntitlementModule,
    TypeOrmModule.forFeature(
      [
        EscrowOrmEntity,
        LedgerEntryOrmEntity,
        SupplierWalletOrmEntity,
        DisputeOrmEntity,
      ],
      'write',
    ),
  ],
  providers: [...commandHandlers, EscrowListener, EscrowAutoReleaseCron],
})
export class EscrowModule {}
