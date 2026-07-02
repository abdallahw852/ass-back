import { Injectable, Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductCreatedEvent } from '../../../product/domain/events/product-created.event';
import { ProductUpdatedEvent } from '../../../product/domain/events/product-updated.event';
import { InventoryItem } from '../../domain/inventory-item.entity';
import type { IInventoryItemRepository } from '../../domain/inventory-item.repository.interface';
import { INVENTORY_ITEM_REPOSITORY } from '../../domain/inventory-item.repository.interface';

@Injectable()
@EventsHandler(ProductCreatedEvent, ProductUpdatedEvent)
export class InventoryEventListener implements IEventHandler<
  ProductCreatedEvent | ProductUpdatedEvent
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepo: IInventoryItemRepository,
  ) {}

  async handle(
    event: ProductCreatedEvent | ProductUpdatedEvent,
  ): Promise<void> {
    if (event instanceof ProductCreatedEvent) {
      await this.handleCreated(event);
    } else {
      await this.handleUpdated(event);
    }
  }

  private async handleCreated(event: ProductCreatedEvent): Promise<void> {
    const { payload } = event;
    if (!payload.trackInventory) return;

    const minStockThreshold = Math.ceil(payload.moq * 1.5);

    if (payload.variants.length > 0) {
      for (const variant of payload.variants) {
        const exists = await this.inventoryRepo.findByProductAndVariant(
          payload.internalId,
          variant.internalId,
        );
        if (exists) continue;

        const item = InventoryItem.create({
          supplierId: payload.supplierId,
          productId: payload.internalId,
          variantId: variant.internalId,
          sku: variant.sku,
          onHand: variant.initialStock,
          minStockThreshold,
        });
        await this.inventoryRepo.create(item);
      }
    } else {
      const exists = await this.inventoryRepo.findByProductAndVariant(
        payload.internalId,
        null,
      );
      if (!exists) {
        const item = InventoryItem.create({
          supplierId: payload.supplierId,
          productId: payload.internalId,
          variantId: null,
          sku: payload.sku,
          onHand: payload.stockQuantity,
          minStockThreshold,
        });
        await this.inventoryRepo.create(item);
      }
    }
  }

  private async handleUpdated(event: ProductUpdatedEvent): Promise<void> {
    const { payload } = event;

    for (const variantId of payload.removedVariantInternalIds) {
      await this.inventoryRepo.removeByVariantId(variantId);
    }

    if (!payload.trackInventory) return;

    const minStockThreshold = Math.ceil(payload.moq * 1.5);

    for (const variant of payload.variants) {
      const exists = await this.inventoryRepo.findByProductAndVariant(
        payload.internalId,
        variant.internalId,
      );
      if (exists) continue;

      const item = InventoryItem.create({
        supplierId: payload.supplierId,
        productId: payload.internalId,
        variantId: variant.internalId,
        sku: variant.sku,
        onHand: variant.quantity,
        minStockThreshold,
      });
      await this.inventoryRepo.create(item);
    }
  }
}
