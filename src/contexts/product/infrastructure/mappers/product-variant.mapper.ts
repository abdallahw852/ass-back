import { ProductVariant } from '../../domain/product-variant.entity';
import { ProductVariantOrmEntity } from '../persistence/product-variant.orm-entity';

/**
 * Maps between the {@link ProductVariant} domain entity and the
 * {@link ProductVariantOrmEntity} persistence representation.
 */
export class ProductVariantMapper {
  /** Reconstitute a domain entity from an ORM row. */
  static toDomain(orm: ProductVariantOrmEntity): ProductVariant {
    return ProductVariant.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      productId: orm.productId,
      sku: orm.sku,
      color: orm.color,
      size: orm.size,
      sizeAr: orm.sizeAr ?? null,
      price: Number(orm.price),
      quantity: orm.quantity,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  /**
   * Map a domain entity to an ORM entity for persistence.
   *
   * When the variant already has an `internalId` (i.e. it was loaded
   * from the DB), the `id` column is set so TypeORM performs an UPDATE
   * rather than an INSERT.
   */
  static toOrm(domain: ProductVariant): ProductVariantOrmEntity {
    const orm = new ProductVariantOrmEntity();
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm._id = domain.id;
    if (domain.productId !== null) orm.productId = domain.productId;
    orm.sku = domain.sku;
    orm.color = domain.color;
    orm.size = domain.size;
    orm.sizeAr = domain.sizeAr;
    orm.price = domain.price;
    orm.quantity = domain.quantity;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
