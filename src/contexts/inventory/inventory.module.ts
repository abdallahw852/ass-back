import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { ProductModule } from '../product/product.module';
import { SupplierModule } from '../supplier/identity/identity.module';
import { IsFullyVerifiedSupplier } from '../../shared/infrastructure/guards/is-fully-verified-supplier.guard';

// ── Presentation ──────────────────────────────────────────────
import { InventoryController } from './presentation/inventory.controller';

// ── Application (event listeners) ────────────────────────────
import { InventoryEventListener } from './application/event-listeners/inventory.listener';

// ── ORM entities ──────────────────────────────────────────────
import { InventoryItemOrmEntity } from './infrastructure/persistence/inventory-item.orm-entity';
import { StockMovementOrmEntity } from './infrastructure/persistence/stock-movement.orm-entity';

// ── Write repositories ────────────────────────────────────────
import { InventoryItemRepository } from './infrastructure/repositories/inventory-item.repository';
import { INVENTORY_ITEM_REPOSITORY } from './domain/inventory-item.repository.interface';

// ── Read repository ───────────────────────────────────────────
import { InventoryItemReadRepository } from './infrastructure/repositories/inventory-item-read.repository';

// ── Command handlers ──────────────────────────────────────────
import { AdjustStockHandler } from './application/commands/adjust-stock.handler';
import { SetMinThresholdHandler } from './application/commands/set-min-threshold.handler';

// ── Query handlers ────────────────────────────────────────────
import { ListInventoryItemsHandler } from './application/queries/list-inventory-items.handler';
import { GetInventoryStatsHandler } from './application/queries/get-inventory-stats.handler';
import { GetInventoryItemHandler } from './application/queries/get-inventory-item.handler';
import { ListStockMovementsHandler } from './application/queries/list-stock-movements.handler';

const CommandHandlers = [AdjustStockHandler, SetMinThresholdHandler];
const QueryHandlers = [
  ListInventoryItemsHandler,
  GetInventoryStatsHandler,
  GetInventoryItemHandler,
  ListStockMovementsHandler,
];

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    ProductModule,
    SupplierModule,
    TypeOrmModule.forFeature(
      [InventoryItemOrmEntity, StockMovementOrmEntity],
      'write',
    ),
  ],
  controllers: [InventoryController],
  providers: [
    IsFullyVerifiedSupplier,

    // Command & query handlers
    ...CommandHandlers,
    ...QueryHandlers,

    // Event listener
    InventoryEventListener,

    // Write repository
    InventoryItemRepository,
    {
      provide: INVENTORY_ITEM_REPOSITORY,
      useExisting: InventoryItemRepository,
    },

    // Read repository
    InventoryItemReadRepository,
  ],
})
export class InventoryModule {}
