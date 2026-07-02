import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { SupplierModule } from '../supplier/identity/identity.module';
import { IsFullyVerifiedSupplier } from '../../shared/infrastructure/guards/is-fully-verified-supplier.guard';

// ── ORM entities ──────────────────────────────────────────────
import { TradeOrderOrmEntity } from '../order/infrastructure/persistence/trade-order.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/user.orm-entity';
import { QuotationOrmEntity } from '../rfq/infrastructure/persistence/quotation.orm-entity';
import { RfqOrmEntity } from '../rfq/infrastructure/persistence/rfq.orm-entity';
import { SupplierOrmEntity } from '../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { ManualClientOrmEntity } from './infrastructure/persistence/manual-client.orm-entity';

// ── Infrastructure ────────────────────────────────────────────
import { ClientReadRepository } from './infrastructure/repositories/client-read.repository';
import { CLIENT_READ_REPOSITORY } from './domain/client-read.repository.interface';
import { ManualClientRepository } from './infrastructure/repositories/manual-client.repository';
import { MANUAL_CLIENT_REPOSITORY } from './domain/manual-client.repository.interface';

// ── Query handlers ────────────────────────────────────────────
import { QueryHandlers } from './application/queries/handlers';

// ── Command handlers ──────────────────────────────────────────
import { CommandHandlers } from './application/commands/handlers';

// ── Presentation ──────────────────────────────────────────────
import { ClientController } from './presentation/client.controller';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    SupplierModule,
    TypeOrmModule.forFeature(
      [
        TradeOrderOrmEntity,
        UserOrmEntity,
        QuotationOrmEntity,
        RfqOrmEntity,
        SupplierOrmEntity,
        ManualClientOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [ClientController],
  providers: [
    IsFullyVerifiedSupplier,
    ...QueryHandlers,
    ...CommandHandlers,
    ClientReadRepository,
    { provide: CLIENT_READ_REPOSITORY, useExisting: ClientReadRepository },
    ManualClientRepository,
    {
      provide: MANUAL_CLIENT_REPOSITORY,
      useExisting: ManualClientRepository,
    },
  ],
})
export class ClientModule {}
