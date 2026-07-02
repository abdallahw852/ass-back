import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IProductBundleItemRepository } from '../../domain/product-bundle-item.repository.interface';
import { BundleItem } from '../../domain/product-group.entity';
import { ProductBundleItemOrmEntity } from '../persistence/product-bundle-item.orm-entity';
import { BundleItemMapper } from '../mappers/bundle-item.mapper';

/**
 * TypeORM implementation of the product bundle item repository.
 *
 * Uses the 'write' database connection for all operations.
 * Maps between {@link BundleItem} domain entities and
 * {@link ProductBundleItemOrmEntity} ORM rows via {@link BundleItemMapper}.
 */
@Injectable()
export class ProductBundleItemRepository implements IProductBundleItemRepository {
  constructor(
    @InjectRepository(ProductBundleItemOrmEntity, 'write')
    private readonly repository: Repository<ProductBundleItemOrmEntity>,
  ) {}

  async findByParentProductId(parentProductId: number): Promise<BundleItem[]> {
    const orms = await this.repository.find({
      where: { parentProductId },
      order: { createdAt: 'ASC' },
    });
    return orms.map((b) => BundleItemMapper.toDomain(b));
  }

  async save(bundleItem: BundleItem): Promise<BundleItem> {
    const orm = BundleItemMapper.toOrm(bundleItem);
    const saved = await this.repository.save(orm);
    return BundleItemMapper.toDomain(saved);
  }

  async removeByParentAndChild(
    parentProductId: number,
    childProductId: string,
  ): Promise<void> {
    await this.repository.delete({ parentProductId, childProductId });
  }

  async removeByParentProductId(parentProductId: number): Promise<void> {
    await this.repository.delete({ parentProductId });
  }
}
