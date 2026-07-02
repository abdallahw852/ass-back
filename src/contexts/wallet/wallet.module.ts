import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { WalletController } from './presentation/wallet.controller';
import { AdminWithdrawalsController } from './presentation/admin-withdrawals.controller';
import { SupplierWalletOrmEntity } from './infrastructure/persistence/supplier-wallet.orm-entity';
import { PayoutMethodOrmEntity } from './infrastructure/persistence/payout-method.orm-entity';
import { WithdrawalRequestOrmEntity } from './infrastructure/persistence/withdrawal-request.orm-entity';
import { AddPayoutMethodHandler } from './application/commands/add-payout-method.handler';
import { RequestWithdrawalHandler } from './application/commands/request-withdrawal.handler';
import { ApproveWithdrawalHandler } from './application/commands/approve-withdrawal.handler';
import { RejectWithdrawalHandler } from './application/commands/reject-withdrawal.handler';
import { ListPayoutMethodsHandler } from './application/queries/list-payout-methods.handler';
import { ListWithdrawalsHandler } from './application/queries/list-withdrawals.handler';
import { ListAdminWithdrawalsHandler } from './application/queries/list-admin-withdrawals.handler';
import { SupplierModule } from '../supplier/identity/identity.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    CqrsModule,
    AuditLogModule,
    TypeOrmModule.forFeature(
      [
        SupplierWalletOrmEntity,
        PayoutMethodOrmEntity,
        WithdrawalRequestOrmEntity,
      ],
      'write',
    ),
    SupplierModule,
  ],
  controllers: [WalletController, AdminWithdrawalsController],
  providers: [
    AddPayoutMethodHandler,
    RequestWithdrawalHandler,
    ApproveWithdrawalHandler,
    RejectWithdrawalHandler,
    ListPayoutMethodsHandler,
    ListWithdrawalsHandler,
    ListAdminWithdrawalsHandler,
  ],
})
export class WalletModule {}
