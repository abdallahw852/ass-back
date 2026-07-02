import { ForbiddenException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AdjustStockCommand } from './adjust-stock.command';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { InventoryItemNotFoundException } from '../../domain/inventory.exceptions';
import { InventoryItemOrmEntity } from '../../infrastructure/persistence/inventory-item.orm-entity';
import { StockMovementOrmEntity } from '../../infrastructure/persistence/stock-movement.orm-entity';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../product/infrastructure/persistence/product-variant.orm-entity';

@CommandHandler(AdjustStockCommand)
export class AdjustStockHandler implements ICommandHandler<AdjustStockCommand> {
  constructor(
    @Inject(getDataSourceToken('write'))
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: AdjustStockCommand) {
    return this.dataSource.transaction(async (em) => {
      // Lock the row for the duration of the transaction so that concurrent
      // adjustments on the same item are serialized by the DB and cannot
      // produce incorrect balanceAfter values in the movement ledger.
      const orm = await em.findOne(InventoryItemOrmEntity, {
        where: { _id: command.inventoryItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!orm)
        throw new InventoryItemNotFoundException(command.inventoryItemId);
      if (orm.supplierId !== command.supplierId) throw new ForbiddenException();

      const item = InventoryItem.reconstitute({
        _id: orm._id,
        internalId: orm.id,
        supplierId: orm.supplierId,
        productId: orm.productId,
        variantId: orm.variantId,
        sku: orm.sku,
        onHand: orm.onHand,
        reservedQty: orm.reservedQty,
        minStockThreshold: orm.minStockThreshold,
        lastMovementAt: orm.lastMovementAt,
        createdAt: orm.createdAt,
        updatedAt: orm.updatedAt,
      });

      const movement = item.adjust(
        command.value,
        command.reason,
        command.actorUserId,
        command.note,
      );

      // Update inventory_items (source of truth)
      await em.update(
        InventoryItemOrmEntity,
        { _id: item.id },
        {
          onHand: item.onHand,
          lastMovementAt: item.lastMovementAt,
          updatedAt: item.updatedAt,
        },
      );

      // Append movement row
      const movementOrm = em.create(StockMovementOrmEntity, {
        _id: movement.id,
        inventoryItemId: movement.inventoryItemInternalId,
        delta: movement.delta,
        balanceAfter: movement.balanceAfter,
        reason: movement.reason,
        note: movement.note,
        actorUserId: movement.actorUserId,
      });
      await em.save(StockMovementOrmEntity, movementOrm);

      // Sync projection columns
      if (item.variantId !== null) {
        await em.update(
          ProductVariantOrmEntity,
          { id: item.variantId },
          { quantity: item.onHand },
        );
      } else {
        await em.update(
          ProductOrmEntity,
          { id: item.productId },
          { stockQuantity: item.onHand },
        );
      }

      return { onHand: item.onHand, status: item.status };
    });
  }
}
