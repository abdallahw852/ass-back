import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ProductStatus } from '../../domain/enums/product-status.enum';
import type { IProductRepository } from '../../domain/product.repository.interface';
import { Product } from '../../domain/product.entity';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import { ProductMapper } from '../mappers/product.mapper';

/**
 * TypeORM implementation of the product repository.
 *
 * Uses the 'write' database connection for all operations.
 * Maps between {@link Product} domain aggregates and
 * {@link ProductOrmEntity} ORM rows via {@link ProductMapper}.
 * Deletions are soft-deletes (sets deletedAt, cascades to children).
 */
@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductOrmEntity, 'write')
    private readonly repository: Repository<ProductOrmEntity>,
  ) {}

  async findByPublicId(publicId: string): Promise<Product | null> {
    const orm = await this.repository.findOne({ where: { _id: publicId } });
    return orm ? ProductMapper.toDomain(orm) : null;
  }

  async findByPublicIdWithRelations(publicId: string): Promise<Product | null> {
    const orm = await this.repository.findOne({
      where: { _id: publicId },
      relations: ['variants', 'bundleItems'],
    });
    return orm ? ProductMapper.toDomain(orm) : null;
  }

  async findByInternalIdWithRelations(
    internalId: number,
  ): Promise<Product | null> {
    const orm = await this.repository.findOne({
      where: { id: internalId },
      relations: ['variants', 'bundleItems'],
    });
    return orm ? ProductMapper.toDomain(orm) : null;
  }

  async save(product: Product): Promise<Product> {
    const orm = ProductMapper.toOrm(product);
    const saved = await this.repository.save(orm);
    // Reload with relations to get generated IDs
    const reloaded = await this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['variants', 'bundleItems'],
    });
    return ProductMapper.toDomain(reloaded);
  }

  async update(product: Product): Promise<Product> {
    const orm = ProductMapper.toOrm(product);
    const saved = await this.repository.save(orm);
    const reloaded = await this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: ['variants', 'bundleItems'],
    });
    return ProductMapper.toDomain(reloaded);
  }

  countActiveBySupplierId(supplierId: number): Promise<number> {
    return this.repository.count({
      where: {
        supplierId,
        status: Not(ProductStatus.ARCHIVED),
      },
    });
  }

  async remove(internalId: number): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: internalId },
      relations: ['variants', 'bundleItems'],
    });
    if (entity) {
      await this.repository.softRemove(entity);
    }
  }
}
