import type { InventoryItem } from './inventory-item.entity';

export const INVENTORY_ITEM_REPOSITORY = Symbol('INVENTORY_ITEM_REPOSITORY');

export interface IInventoryItemRepository {
  findById(id: string): Promise<InventoryItem | null>;
  findByProductAndVariant(
    productId: number,
    variantId: number | null,
  ): Promise<InventoryItem | null>;
  save(item: InventoryItem): Promise<void>;
  create(item: InventoryItem): Promise<void>;
  removeByVariantId(variantId: number): Promise<void>;
}
