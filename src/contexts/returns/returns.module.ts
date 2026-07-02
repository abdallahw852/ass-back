import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { SupplierModule } from '../supplier/identity/identity.module';
import { OrderModule } from '../order/order.module';
import { IsFullyVerifiedSupplier } from '../../shared/infrastructure/guards/is-fully-verified-supplier.guard';

// ── ORM entities ──────────────────────────────────────────────
import { ReturnRequestOrmEntity } from './infrastructure/persistence/return-request.orm-entity';
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';

// ── Presentation ──────────────────────────────────────────────
import { ReturnsController } from './presentation/returns.controller';

// ── Command handlers ──────────────────────────────────────────
import { FileReturnRequestHandler } from './application/commands/file-return-request.handler';
import { ApproveReturnHandler } from './application/commands/approve-return.handler';
import { RejectReturnHandler } from './application/commands/reject-return.handler';
import { RefundReturnHandler } from './application/commands/refund-return.handler';

// ── Query handlers ────────────────────────────────────────────
import { ListReturnRequestsHandler } from './application/queries/list-return-requests.handler';
import { GetReturnRequestHandler } from './application/queries/get-return-request.handler';

const commandHandlers = [
  FileReturnRequestHandler,
  ApproveReturnHandler,
  RejectReturnHandler,
  RefundReturnHandler,
];

const queryHandlers = [ListReturnRequestsHandler, GetReturnRequestHandler];

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    SupplierModule,
    OrderModule,
    TypeOrmModule.forFeature(
      [
        ReturnRequestOrmEntity,
        TradeOrderOrmEntity,
        UserOrmEntity,
        SupplierOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [ReturnsController],
  providers: [IsFullyVerifiedSupplier, ...queryHandlers, ...commandHandlers],
})
export class ReturnsModule {}
