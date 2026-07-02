import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IProductVariantRepository } from '../../domain/product-variant.repository.interface';
import { ProductVariant } from '../../domain/product-variant.entity';
import { ProductVariantOrmEntity } from '../persistence/product-variant.orm-entity';
import { ProductVariantMapper } from '../mappers/product-variant.mapper';

/**
 * TypeORM implementation of the product variant repository.
 *
 * Uses the 'write' database connection for all operations.
 * Maps between {@link ProductVariant} domain entities and
 * {@link ProductVariantOrmEntity} ORM rows via {@link ProductVariantMapper}.
 */
@Injectable()
export class ProductVariantRepository implements IProductVariantRepository {
  constructor(
    @InjectRepository(ProductVariantOrmEntity, 'write')
    private readonly repository: Repository<ProductVariantOrmEntity>,
  ) {}

  async findByPublicId(publicId: string): Promise<ProductVariant | null> {
    const orm = await this.repository.findOne({ where: { _id: publicId } });
    return orm ? ProductVariantMapper.toDomain(orm) : null;
  }

  async findByProductId(productId: number): Promise<ProductVariant[]> {
    const orms = await this.repository.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });
    return orms.map((v) => ProductVariantMapper.toDomain(v));
  }

  async save(variant: ProductVariant): Promise<ProductVariant> {
    const orm = ProductVariantMapper.toOrm(variant);
    const saved = await this.repository.save(orm);
    return ProductVariantMapper.toDomain(saved);
  }

  async remove(internalId: number): Promise<void> {
    await this.repository.softDelete(internalId);
  }
}
