import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { IInventoryItemRepository } from '../../domain/inventory-item.repository.interface';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { InventoryItemOrmEntity } from '../persistence/inventory-item.orm-entity';

@Injectable()
export class InventoryItemRepository implements IInventoryItemRepository {
  constructor(
    @InjectRepository(InventoryItemOrmEntity, 'write')
    private readonly repo: Repository<InventoryItemOrmEntity>,
  ) {}

  async findById(id: string): Promise<InventoryItem | null> {
    const orm = await this.repo.findOne({ where: { _id: id } });
    return orm ? this.toDomain(orm) : null;
  }

  async findByProductAndVariant(
    productId: number,
    variantId: number | null,
  ): Promise<InventoryItem | null> {
    const orm = await this.repo.findOne({
      where:
        variantId === null
          ? { productId, variantId: IsNull() }
          : { productId, variantId },
    });
    return orm ? this.toDomain(orm) : null;
  }

  async save(item: InventoryItem): Promise<void> {
    await this.repo.update(
      { _id: item.id },
      {
        sku: item.sku,
        onHand: item.onHand,
        reservedQty: item.reservedQty,
        minStockThreshold: item.minStockThreshold,
        lastMovementAt: item.lastMovementAt,
        updatedAt: item.updatedAt,
      },
    );
  }

  async removeByVariantId(variantId: number): Promise<void> {
    await this.repo.delete({ variantId });
  }

  async create(item: InventoryItem): Promise<void> {
    const orm = this.repo.create({
      _id: item.id,
      supplierId: item.supplierId,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      onHand: item.onHand,
      reservedQty: item.reservedQty,
      minStockThreshold: item.minStockThreshold,
      lastMovementAt: item.lastMovementAt,
    });
    await this.repo.save(orm);
  }

  private toDomain(orm: InventoryItemOrmEntity): InventoryItem {
    return InventoryItem.reconstitute({
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
  }
}
